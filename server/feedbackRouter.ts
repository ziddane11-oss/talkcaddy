import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { feedback, analysisResults, userPreferences } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const feedbackRouter = router({
  /**
   * 답변 피드백 제출
   * 사용자가 특정 톤의 답변에 대해 만족도를 피드백합니다.
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        analysisResultId: z.number().int().positive(),
        tone: z.enum(["soft", "strong", "neutral"]),
        rating: z.number().int().min(-1).max(1),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // 분석 결과가 사용자의 것인지 확인
        const analysis = await db.select().from(analysisResults).where(eq(analysisResults.id, input.analysisResultId)).limit(1);
        if (analysis.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "분석 결과를 찾을 수 없습니다.",
          });
        }



        // 기존 피드백이 있으면 업데이트, 없으면 생성
        const existingFeedback = await db.select().from(feedback).where(and(
          eq(feedback.analysisResultId, input.analysisResultId),
          eq(feedback.userId, ctx.user.id),
          eq(feedback.tone, input.tone)
        )).limit(1);

        if (existingFeedback.length > 0) {
          // 업데이트
          await db
            .update(feedback)
            .set({
              rating: input.rating,
              comment: input.comment,
            })
            .where(eq(feedback.id, existingFeedback[0].id));
        } else {
          // 생성
          await db.insert(feedback).values({
            analysisResultId: input.analysisResultId,
            userId: ctx.user.id,
            tone: input.tone,
            rating: input.rating,
            comment: input.comment,
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "피드백 제출 중 오류가 발생했습니다.",
        });
      }
    }),

  /**
   * 분석 결과별 피드백 통계 조회
   */
  getStats: publicProcedure
    .input(
      z.object({
        analysisResultId: z.number().int().positive(),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const feedbacks = await db.select().from(feedback).where(eq(feedback.analysisResultId, input.analysisResultId));

        // 톤별 통계
        const stats = {
          soft: { positive: 0, negative: 0, neutral: 0, total: 0 },
          strong: { positive: 0, negative: 0, neutral: 0, total: 0 },
          neutral: { positive: 0, negative: 0, neutral: 0, total: 0 },
        };

        feedbacks.forEach((fb: any) => {
          const tone = fb.tone as "soft" | "strong" | "neutral";
          stats[tone].total++;
          if (fb.rating === 1) stats[tone].positive++;
          else if (fb.rating === -1) stats[tone].negative++;
          else stats[tone].neutral++;
        });

        return stats;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "통계 조회 중 오류가 발생했습니다.",
        });
      }
    }),

  /**
   * 사용자의 톤 선호도 저장
   */
  setPreferredTone: protectedProcedure
    .input(
      z.object({
        tone: z.enum(["soft", "strong", "neutral"]),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // 기존 선호도가 있으면 업데이트, 없으면 생성
        const existingPref = await db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.user.id)).limit(1);

        if (existingPref.length > 0) {
          await db
            .update(userPreferences)
            .set({ preferredTone: input.tone })
            .where(eq(userPreferences.userId, ctx.user.id));
        } else {
          await db.insert(userPreferences).values({
            userId: ctx.user.id,
            preferredTone: input.tone,
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "선호도 저장 중 오류가 발생했습니다.",
        });
      }
    }),

  /**
   * 사용자의 톤 선호도 조회
   */
  getPreferredTone: protectedProcedure.query(async ({ ctx }: any) => {
    try {
      const db = await getDb();
      if (!db) return "neutral";
      
      const pref = await db.select().from(userPreferences).where(eq(userPreferences.userId, ctx.user.id)).limit(1);

      return pref.length > 0 ? pref[0].preferredTone : "neutral";
    } catch (error) {
      return "neutral";
    }
  }),
});
