/**
 * 에러 로깅 유틸리티
 * 프로덕션 에러 추적 및 디버깅을 위한 중앙화된 로깅 시스템
 */

import { getDb } from "./db";
import { errorLogs, type InsertErrorLog } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { queueErrorNotification } from "./notificationService";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorLogInput {
  userId?: number;
  errorCode: string;
  errorMessage: string;
  location: string; // analyzeText, analyzeScreenshot, pipeline 등
  context?: Record<string, any>;
  stackTrace?: string;
  statusCode?: number;
  severity?: ErrorSeverity;
}

/**
 * 에러를 DB에 저장
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[ERROR_LOG_DB_UNAVAILABLE]", input);
      return;
    }

    const logEntry: InsertErrorLog = {
      userId: input.userId || null,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      location: input.location,
      context: input.context ? JSON.stringify(input.context) : null,
      stackTrace: input.stackTrace || null,
      statusCode: input.statusCode || 500,
      severity: input.severity || "error",
      resolved: 0,
    };

    // P0-3: MySQL insert 및 PK 안전 확보
    const insertResult = await db.insert(errorLogs).values(logEntry);
    
    let errorLogId: number | null = null;
    
    // insertResult에서 ID 추출 시도
    if (insertResult && typeof insertResult === 'object' && 'insertId' in insertResult) {
      errorLogId = insertResult.insertId as number;
    }
    
    // 실패 시 최근 로그로 조회
    if (!errorLogId) {
      const recentLog = await db.select().from(errorLogs).orderBy(errorLogs.id).limit(1);
      if (recentLog && recentLog.length > 0) {
        errorLogId = recentLog[0].id;
      }
    }

    // P0-3: ID가 없으면 null 반환 (UUID 억지 생성 금지)
    if (errorLogId && (input.severity === "critical" || input.severity === "error")) {
      await queueErrorNotification(errorLogId, input.severity);
    } else if (!errorLogId) {
      console.warn("[ERROR_LOG_ID_MISSING] Log saved but insertId is undefined (Driver limit). Notification skipped.");
    }
    
    // 콘솔에도 출력 (개발 및 로그 모니터링용)
    console.error(`[${input.severity || "ERROR"}] ${input.location}:`, {
      code: input.errorCode,
      message: input.errorMessage,
      context: input.context,
    });
  } catch (err) {
    // DB 저장 실패 시 콘솔에만 출력 (무한 루프 방지)
    console.error("[ERROR_LOG_FAILED]", input, err);
  }
}

/**
 * 최근 에러 목록 조회 (관리자용)
 */
export async function getRecentErrors(limit: number = 50) {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select()
      .from(errorLogs)
      .orderBy(errorLogs.createdAt)
      .limit(limit);
    return result;
  } catch (err) {
    console.error("[ERROR_LOG_QUERY_FAILED]", err);
    return [];
  }
}

/**
 * 특정 사용자의 에러 히스토리 조회
 */
export async function getUserErrorHistory(userId: number, limit: number = 20) {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.userId, userId))
      .orderBy(errorLogs.createdAt)
      .limit(limit);
    return result;
  } catch (err) {
    console.error("[ERROR_LOG_USER_QUERY_FAILED]", err);
    return [];
  }
}

/**
 * 에러 통계 조회
 */
export async function getErrorStats() {
  try {
    const db = await getDb();
    if (!db) return null;

    // 에러 코드별 발생 빈도
    const result = await db
      .select()
      .from(errorLogs)
      .orderBy(errorLogs.createdAt);
    
    const stats = {
      totalErrors: result.length,
      bySeverity: {
        info: result.filter((e: any) => e.severity === "info").length,
        warning: result.filter((e: any) => e.severity === "warning").length,
        error: result.filter((e: any) => e.severity === "error").length,
        critical: result.filter((e: any) => e.severity === "critical").length,
      },
      byErrorCode: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      resolved: result.filter((e: any) => e.resolved === 1).length,
    };

    // 에러 코드별 집계
    result.forEach((e: any) => {
      stats.byErrorCode[e.errorCode] = (stats.byErrorCode[e.errorCode] || 0) + 1;
      stats.byLocation[e.location] = (stats.byLocation[e.location] || 0) + 1;
    });

    return stats;
  } catch (err) {
    console.error("[ERROR_STATS_FAILED]", err);
    return null;
  }
}

/**
 * 에러 해결 표시
 */
export async function markErrorAsResolved(errorLogId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db
      .update(errorLogs)
      .set({ resolved: 1 })
      .where(eq(errorLogs.id, errorLogId));
  } catch (err) {
    console.error("[ERROR_MARK_RESOLVED_FAILED]", err);
  }
}
