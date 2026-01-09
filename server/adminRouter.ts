/**
 * 관리자 라우터
 * 에러 로그 조회 및 통계 기능
 */

import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getRecentErrors,
  getUserErrorHistory,
  getErrorStats,
  markErrorAsResolved,
} from "./errorLogging";

export const adminRouter = router({
  /**
   * 최근 에러 목록 조회 (관리자만)
   */
  getRecentErrors: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      // 관리자 권한 확인
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "관리자만 접근 가능합니다",
        });
      }

      const errors = await getRecentErrors(input.limit);
      return errors.map((e) => ({
        id: e.id,
        userId: e.userId,
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
        location: e.location,
        context: e.context ? JSON.parse(e.context) : null,
        statusCode: e.statusCode,
        severity: e.severity,
        resolved: e.resolved === 1,
        createdAt: e.createdAt,
      }));
    }),

  /**
   * 특정 사용자의 에러 히스토리 조회
   */
  getUserErrors: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // 관리자 권한 확인 또는 자신의 에러만 조회
      if (ctx.user?.role !== "admin" && ctx.user?.id !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "접근 권한이 없습니다",
        });
      }

      const errors = await getUserErrorHistory(input.userId, input.limit);
      return errors.map((e) => ({
        id: e.id,
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
        location: e.location,
        context: e.context ? JSON.parse(e.context) : null,
        statusCode: e.statusCode,
        severity: e.severity,
        resolved: e.resolved === 1,
        createdAt: e.createdAt,
      }));
    }),

  /**
   * 에러 통계 조회
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // 관리자 권한 확인
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "관리자만 접근 가능합니다",
      });
    }

    const stats = await getErrorStats();
    return stats;
  }),

  /**
   * 에러를 해결된 것으로 표시
   */
  markAsResolved: protectedProcedure
    .input(z.object({ errorLogId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 관리자 권한 확인
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "관리자만 접근 가능합니다",
        });
      }

      await markErrorAsResolved(input.errorLogId);
      return { success: true };
    }),

  /**
   * 에러 코드별 필터링된 목록 조회
   */
  getErrorsByCode: protectedProcedure
    .input(
      z.object({
        errorCode: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // 관리자 권한 확인
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "관리자만 접근 가능합니다",
        });
      }

      const errors = await getRecentErrors(input.limit);
      const filtered = errors.filter((e) => e.errorCode === input.errorCode);

      return filtered.map((e) => ({
        id: e.id,
        userId: e.userId,
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
        location: e.location,
        context: e.context ? JSON.parse(e.context) : null,
        statusCode: e.statusCode,
        severity: e.severity,
        resolved: e.resolved === 1,
        createdAt: e.createdAt,
      }));
    }),
});
