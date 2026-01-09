import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  classifyBugWithAI,
  calculatePriorityScore,
  findSimilarBugs,
} from "./bugClassification";
import { getFeedback, getAllFeedback } from "./betaFeedback";

/**
 * 버그 분류 라우터
 */
export const bugClassificationRouter = router({
  /**
   * 버그 자동 분류 (AI 기반)
   */
  classifyBug: protectedProcedure
    .input(z.object({ feedbackId: z.string() }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("관리자만 분류할 수 있습니다");
      }

      const feedback = getFeedback(input.feedbackId);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }

      if (feedback.feedbackType !== "bug") {
        throw new Error("버그만 분류할 수 있습니다");
      }

      try {
        const classification = await classifyBugWithAI(feedback);
        const priorityScore = calculatePriorityScore(
          classification,
          feedback.reproducible
        );

        // 유사 버그 찾기
        const allFeedbacks = getAllFeedback();
        const similarBugs = findSimilarBugs(feedback, allFeedbacks, 0.6);

        return {
          success: true,
          classification: {
            ...classification,
            priorityScore,
          },
          similarBugs: similarBugs.map((b) => ({
            id: b.id,
            title: b.title,
            status: b.status,
          })),
        };
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "분류 실패"
        );
      }
    }),

  /**
   * 유사 버그 찾기
   */
  findSimilar: protectedProcedure
    .input(z.object({ feedbackId: z.string() }))
    .query(async ({ input }: { input: any }) => {
      const feedback = getFeedback(input.feedbackId);
      if (!feedback) {
        throw new Error("피드백을 찾을 수 없습니다");
      }

      const allFeedbacks = getAllFeedback();
      const similarBugs = findSimilarBugs(feedback, allFeedbacks, 0.5);

      return similarBugs.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        severity: b.severity,
        priorityScore: b.priorityScore,
        createdAt: b.createdAt,
      }));
    }),

  /**
   * 버그 분류 통계
   */
  getStats: protectedProcedure.query(async () => {
    const feedbacks = getAllFeedback({ type: "bug" });

    const stats = {
      total: feedbacks.length,
      bySeverity: {
        critical: feedbacks.filter((f) => f.severity === "critical").length,
        high: feedbacks.filter((f) => f.severity === "high").length,
        medium: feedbacks.filter((f) => f.severity === "medium").length,
        low: feedbacks.filter((f) => f.severity === "low").length,
      },
      byStatus: {
        open: feedbacks.filter((f) => f.status === "open").length,
        in_progress: feedbacks.filter((f) => f.status === "in_progress").length,
        resolved: feedbacks.filter((f) => f.status === "resolved").length,
        rejected: feedbacks.filter((f) => f.status === "rejected").length,
      },
      reproducible: feedbacks.filter((f) => f.reproducible).length,
      averagePriority:
        feedbacks.reduce((sum, f) => sum + f.priorityScore, 0) / feedbacks.length || 0,
    };

    return stats;
  }),

  /**
   * 우선순위 상위 버그
   */
  getTopPriority: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }: { input: any }) => {
      const feedbacks = getAllFeedback({ type: "bug", status: "open" });
      return feedbacks.slice(0, input.limit).map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        priorityScore: f.priorityScore,
        reproducible: f.reproducible,
        createdAt: f.createdAt,
      }));
    }),
});
