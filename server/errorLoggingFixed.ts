/**
 * P0-3: insertId 문제 해결
 * 기존 INT 기반 ID는 유지하되, 에러 로깅 후 즉시 알림 큐에 추가
 * 이를 통해 insertId 의존성 제거 및 알림 큐 활성화
 */

import { getDb } from "./db";
import { errorLogs, errorNotificationQueue } from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

/**
 * 에러 로그 생성 및 알림 큐 자동 활성화
 */
export async function logError(
  userId: string | null,
  errorCode: string,
  errorMessage: string,
  location: string,
  context: any = null,
  stackTrace: string = "",
  statusCode: number | null = null,
  severity: "info" | "warning" | "error" | "critical" = "error"
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.error("[Error Logging] Database not available");
    throw new Error("Database not available");
  }

  try {
    // 1. 에러 로그 저장
    const result = await db.insert(errorLogs).values({
      errorCode,
      errorMessage,
      location,
      context: context ? JSON.stringify(context) : null,
      stackTrace,
      statusCode,
      severity,
      resolved: 0, // 0 = false
      createdAt: new Date(),
      ...(userId ? { userId: parseInt(userId, 10) } : {}),
    });

    // 2. insertId 추출 (P0-3 수정: 안전한 방식)
    const errorLogId = result[0]?.insertId;
    if (!errorLogId) {
      console.error("[Error Logging] Failed to get insertId");
      throw new Error("Failed to get insertId");
    }

    console.log(`[Error Logging] Error logged: ${errorLogId} (${errorCode})`);

    // 3. 심각도 높은 에러는 알림 큐에 추가 (P0-3: 자동 활성화)
    if (severity === "critical" || severity === "error") {
      await queueErrorNotification(errorLogId, severity);
    }

    return errorLogId;
  } catch (error) {
    console.error("[Error Logging] Failed to log error:", error);
    throw error;
  }
}

/**
 * 에러 알림 큐에 추가 (P0-3 수정: insertId 문제 해결)
 */
export async function queueErrorNotification(
  errorLogId: number,
  severity: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Error Notification Queue] Database not available");
    return;
  }

  try {
    // P0-3: 기본 채널 설정 (이메일)
    const result = await db.insert(errorNotificationQueue).values({
      errorLogId,
      channel: "email",
      recipient: "admin@talkcaddy.com", // 실제로는 관리자 이메일 설정에서 가져올 것
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
    });

    const notificationId = result[0]?.insertId;
    console.log(`[Error Notification Queue] Notification queued: ${notificationId}`);
  } catch (error) {
    console.error("[Error Notification Queue] Failed to queue notification:", error);
    // 알림 큐 실패는 에러 로깅을 중단하지 않음
  }
}

/**
 * 최근 에러 조회
 */
export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Error Logging] Failed to get recent errors:", error);
    return [];
  }
}

/**
 * 사용자별 에러 히스토리
 */
export async function getUserErrorHistory(
  userId: number,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.userId, userId))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Error Logging] Failed to get user error history:", error);
    return [];
  }
}

/**
 * 에러 통계
 */
export async function getErrorStats(): Promise<{
  totalErrors: number;
  bySeverity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  resolved: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalErrors: 0,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      resolved: 0,
    };
  }

  try {
    const all = await db.select().from(errorLogs);

    const stats = {
      totalErrors: all.length,
      bySeverity: {
        info: all.filter((e) => e.severity === "info").length,
        warning: all.filter((e) => e.severity === "warning").length,
        error: all.filter((e) => e.severity === "error").length,
        critical: all.filter((e) => e.severity === "critical").length,
      },
      resolved: all.filter((e) => e.resolved).length,
    };

    return stats;
  } catch (error) {
    console.error("[Error Logging] Failed to get error stats:", error);
    return {
      totalErrors: 0,
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      resolved: 0,
    };
  }
}

/**
 * 에러 해결 표시
 */
export async function markErrorAsResolved(errorLogId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Error Logging] Database not available");
    return;
  }

  try {
    await db
      .update(errorLogs)
      .set({ resolved: 1 }) // 1 = true
      .where(eq(errorLogs.id, errorLogId));

    console.log(`[Error Logging] Error marked as resolved: ${errorLogId}`);
  } catch (error) {
    console.error("[Error Logging] Failed to mark error as resolved:", error);
  }
}

/**
 * 에러 코드별 조회
 */
export async function getErrorsByCode(
  errorCode: string,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.errorCode, errorCode))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Error Logging] Failed to get errors by code:", error);
    return [];
  }
}

/**
 * 최근 N시간 에러 조회
 */
export async function getRecentErrorsByTime(
  hours: number = 24,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await db
      .select()
      .from(errorLogs)
      .where(gte(errorLogs.createdAt, since))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Error Logging] Failed to get recent errors by time:", error);
    return [];
  }
}
