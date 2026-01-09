import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createFeedback,
  getFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  markAsDuplicate,
  getFeedbackStats,
  detectDuplicates,
  onFeedbackUpdate,
} from "./betaFeedback";

/**
 * 베타 피드백 라우터
 */
export const betaFeedbackRouter = router({
  /**
   * 피드백 생성
   */
  create: protectedProcedure
    .input(
      z.object({
        feedbackType: z.enum(["feature", "bug", "usability"]),
        title: z.string().min(5, "제목은 최소 5자 이상"),
        description: z.string().min(10, "설명은 최소 10자 이상"),
        rating: z.number().min(1).max(5).optional(),
        deviceInfo: z.string().optional(),
        reproducible: z.boolean().default(false),
        reproductionSteps: z.string().optional(),
        screenshotUrl: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      const feedback = createFeedback(ctx.user?.id || 0, {
        ...input,
        userId: ctx.user?.id || 0,
        status: "open",
      });

      // 중복 감지
      const duplicates = detectDuplicates(feedback, 0.65);
      if (duplicates.length > 0) {
        console.log(`[Beta] 유사 피드백 ${duplicates.length}개 감지됨`);
      }

      return {
        success: true,
        feedback: {
          id: feedback.id,
          title: feedback.title,
          status: feedback.status,
          priorityScore: feedback.priorityScore,
          createdAt: feedback.createdAt,
        },
        duplicateCount: duplicates.length,
      };
    }),

  /**
   * 피드백 조회
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }: { input: any }) => {
      const feedback = getFeedback(input.id);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }
      return feedback;
    }),

  /**
   * 모든 피드백 조회 (필터링)
   */
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["feature", "bug", "usability"]).optional(),
        status: z.enum(["open", "in_progress", "resolved", "rejected"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
    )
    .query(async ({ input }: { input: any }) => {
      return getAllFeedback({
        type: input.type,
        status: input.status,
        severity: input.severity,
      });
    }),

  /**
   * 피드백 상태 업데이트 (관리자만)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "in_progress", "resolved", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("관리자만 상태를 변경할 수 있습니다");
      }

      const feedback = updateFeedbackStatus(input.id, input.status);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }

      return {
        success: true,
        feedback,
      };
    }),

  /**
   * 중복 표시 (관리자만)
   */
  markDuplicate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        duplicateOfId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("관리자만 중복을 표시할 수 있습니다");
      }

      const feedback = markAsDuplicate(input.id, input.duplicateOfId);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }

      return {
        success: true,
        feedback,
      };
    }),

  /**
   * 피드백 통계 조회
   */
  getStats: protectedProcedure.query(async () => {
    return getFeedbackStats();
  }),

  /**
   * 중복 감지
   */
  detectDuplicates: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }: { input: any }) => {
      const feedback = getFeedback(input.id);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }

      const duplicates = detectDuplicates(feedback, 0.65);
      return duplicates.map((f) => ({
        id: f.id,
        title: f.title,
        similarity: 0.7, // 간단한 계산
      }));
    }),
});
