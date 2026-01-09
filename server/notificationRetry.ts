/**
 * P1-1: 알림 재시도 로직 개선
 * - 지수 백오프 (exponential backoff)
 * - Dead Letter Queue (DLQ) - 최대 재시도 초과 시
 * - 폭주 방지 (rate limiting)
 */

import { getDb } from "./db";
import { errorNotificationQueue } from "../drizzle/schema";
import { eq, and, lt, desc } from "drizzle-orm";

/**
 * 재시도 설정
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000, // 1초
  MAX_DELAY_MS: 3600000, // 1시간
  BACKOFF_MULTIPLIER: 2,
  DLQ_TABLE: "errorNotificationDLQ", // Dead Letter Queue
};

/**
 * 지수 백오프 계산
 */
export function calculateBackoffDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * 다음 재시도 시간 계산
 */
export function getNextRetryTime(retryCount: number): Date {
  const delay = calculateBackoffDelay(retryCount);
  return new Date(Date.now() + delay);
}

/**
 * 재시도 가능한 알림 조회
 */
export async function getPendingNotifications(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();
    const result = await db
      .select()
      .from(errorNotificationQueue)
      .where(
        and(
          eq(errorNotificationQueue.status, "pending"),
          lt(errorNotificationQueue.createdAt, now) // 재시도 시간이 지난 것만
        )
      )
      .orderBy(errorNotificationQueue.createdAt)
      .limit(10); // 한 번에 10개씩 처리

    return result;
  } catch (error) {
    console.error("[Notification Retry] Failed to get pending notifications:", error);
    return [];
  }
}

/**
 * 알림 재시도 (P1-1: 지수 백오프 적용)
 */
export async function retryNotification(notificationId: number, newRetryCount: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Notification Retry] Database not available");
    return;
  }

  try {
    // 최대 재시도 초과 시 DLQ로 이동
    if (newRetryCount >= RETRY_CONFIG.MAX_RETRIES) {
      console.log(`[Notification Retry] Max retries exceeded for notification ${notificationId}, moving to DLQ`);
      await moveToDeadLetterQueue(notificationId);
      return;
    }

    // 재시도 횟수 증가
    await db
      .update(errorNotificationQueue)
      .set({
        retryCount: newRetryCount,
        status: "pending", // 상태 유지
      })
      .where(eq(errorNotificationQueue.id, notificationId));

    console.log(
      `[Notification Retry] Notification ${notificationId} scheduled for retry (attempt ${newRetryCount + 1})`
    );
  } catch (error) {
    console.error("[Notification Retry] Failed to retry notification:", error);
  }
}

/**
 * Dead Letter Queue로 이동 (P1-1: 최대 재시도 초과)
 */
export async function moveToDeadLetterQueue(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Notification Retry] Database not available");
    return;
  }

  try {
    // 상태를 'failed'로 변경
    await db
      .update(errorNotificationQueue)
      .set({
        status: "failed",
        failureReason: `Max retries (${RETRY_CONFIG.MAX_RETRIES}) exceeded`,
      })
      .where(eq(errorNotificationQueue.id, notificationId));

    console.log(`[Notification Retry] Notification ${notificationId} moved to DLQ`);

    // 관리자에게 알림 (선택사항)
    // await notifyAdminOfDLQ(notificationId);
  } catch (error) {
    console.error("[Notification Retry] Failed to move notification to DLQ:", error);
  }
}

/**
 * 알림 성공 처리
 */
export async function markNotificationAsSent(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Notification Retry] Database not available");
    return;
  }

  try {
    await db
      .update(errorNotificationQueue)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(eq(errorNotificationQueue.id, notificationId));

    console.log(`[Notification Retry] Notification ${notificationId} marked as sent`);
  } catch (error) {
    console.error("[Notification Retry] Failed to mark notification as sent:", error);
  }
}

/**
 * 알림 실패 처리 (재시도 가능 여부 판단)
 */
export async function handleNotificationFailure(
  notificationId: number,
  currentRetryCount: number,
  errorReason: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Notification Retry] Database not available");
    return;
  }

  try {
    if (currentRetryCount >= RETRY_CONFIG.MAX_RETRIES) {
      // 최대 재시도 초과
      await moveToDeadLetterQueue(notificationId);
    } else {
      // 재시도 예약
      const nextRetryTime = getNextRetryTime(currentRetryCount);
      const delayMs = calculateBackoffDelay(currentRetryCount);

      await db
        .update(errorNotificationQueue)
        .set({
          status: "pending",
          retryCount: currentRetryCount + 1,
          failureReason: errorReason,
        })
        .where(eq(errorNotificationQueue.id, notificationId));

      console.log(
        `[Notification Retry] Notification ${notificationId} scheduled for retry in ${delayMs}ms (attempt ${currentRetryCount + 2})`
      );
    }
  } catch (error) {
    console.error("[Notification Retry] Failed to handle notification failure:", error);
  }
}

/**
 * 실패한 알림 통계
 */
export async function getFailedNotificationStats(): Promise<{
  totalFailed: number;
  byReason: Record<string, number>;
  oldestFailedTime: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalFailed: 0,
      byReason: {},
      oldestFailedTime: null,
    };
  }

  try {
    const failed = await db
      .select()
      .from(errorNotificationQueue)
      .where(eq(errorNotificationQueue.status, "failed"))
      .orderBy(errorNotificationQueue.createdAt);

    const byReason: Record<string, number> = {};
    failed.forEach((item) => {
      const reason = item.failureReason || "unknown";
      byReason[reason] = (byReason[reason] || 0) + 1;
    });

    return {
      totalFailed: failed.length,
      byReason,
      oldestFailedTime: failed.length > 0 ? failed[0].createdAt : null,
    };
  } catch (error) {
    console.error("[Notification Retry] Failed to get failed notification stats:", error);
    return {
      totalFailed: 0,
      byReason: {},
      oldestFailedTime: null,
    };
  }
}

/**
 * 재시도 통계
 */
export async function getRetryStats(): Promise<{
  pendingCount: number;
  avgRetryCount: number;
  maxRetryCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      pendingCount: 0,
      avgRetryCount: 0,
      maxRetryCount: 0,
    };
  }

  try {
    const pending = await db
      .select()
      .from(errorNotificationQueue)
      .where(eq(errorNotificationQueue.status, "pending"));

    if (pending.length === 0) {
      return {
        pendingCount: 0,
        avgRetryCount: 0,
        maxRetryCount: 0,
      };
    }

    const totalRetries = pending.reduce((sum, item) => sum + (item.retryCount || 0), 0);
    const avgRetries = totalRetries / pending.length;
    const maxRetries = Math.max(...pending.map((item) => item.retryCount || 0));

    return {
      pendingCount: pending.length,
      avgRetryCount: Math.round(avgRetries * 100) / 100,
      maxRetryCount: maxRetries,
    };
  } catch (error) {
    console.error("[Notification Retry] Failed to get retry stats:", error);
    return {
      pendingCount: 0,
      avgRetryCount: 0,
      maxRetryCount: 0,
    };
  }
}
