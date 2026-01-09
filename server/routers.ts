import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import { generateAnalysisPrompt, generateRegeneratePrompt, generateReanalysisPrompt, type PromptMode } from "./promptTemplates";
import { detectGroupChat, getGroupChatPromptModifier } from "./groupChatDetector";
import { feedbackRouter } from "./feedbackRouter";
import { pipelineRouter } from "./pipelineRouters";
import { logError } from "./errorLogging";

import { adminRouter } from "./adminRouter";
import { betaRouter } from "./betaRouter";
import { betaFeedbackRouter } from "./betaFeedbackRouter";
import { bugClassificationRouter } from "./bugClassificationRouter";
import { safeParseAIResponse, parseAnalysisResponse } from "./textParser";
import { enforceStyleBatch, type StyleConstraints } from "../src/lib/enforceStyle";

export const appRouter = router({
  system: systemRouter,
  pipeline: pipelineRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 대화방 관리
  conversations: router({
    // 사용자의 모든 대화방 조회
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getConversationsByUserId(ctx.user.id);
    }),

    // 특정 대화방 조회
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getConversationById(input.id);
      }),

    // 대화방 생성
    create: protectedProcedure
      .input(z.object({
        partnerName: z.string(),
        relationshipType: z.enum(["썸", "연애", "재회", "직장", "거래", "기타"]),
        goals: z.array(z.string()),
        restrictions: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await db.createConversation({
          userId: ctx.user.id,
          partnerName: input.partnerName,
          relationshipType: input.relationshipType,
          goals: JSON.stringify(input.goals),
          restrictions: input.restrictions ? JSON.stringify(input.restrictions) : null,
        });
        return { id: conversationId };
      }),

    // 대화방 프로필 업데이트
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        partnerName: z.string().optional(),
        relationshipType: z.enum(["썸", "연애", "재회", "직장", "거래", "기타"]).optional(),
        goals: z.array(z.string()).optional(),
        restrictions: z.array(z.string()).optional(),
        noLongMessage: z.boolean().optional(),
        noEmotional: z.boolean().optional(),
        forcePolite: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = {};
        if (input.partnerName) updateData.partnerName = input.partnerName;
        if (input.relationshipType) updateData.relationshipType = input.relationshipType;
        if (input.goals) updateData.goals = JSON.stringify(input.goals);
        if (input.restrictions) updateData.restrictions = JSON.stringify(input.restrictions);
        if (typeof input.noLongMessage === "boolean") updateData.noLongMessage = input.noLongMessage;
        if (typeof input.noEmotional === "boolean") updateData.noEmotional = input.noEmotional;
        if (typeof input.forcePolite === "boolean") updateData.forcePolite = input.forcePolite;

        await db.updateConversation(input.id, updateData);
        return { success: true };
      }),

    // 대화방 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteConversation(input.id);
        return { success: true };
      }),

    // 대화방의 메시지 히스토리 조회
    getHistory: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return db.getMessageHistoryByConversationId(input.conversationId);
      }),
  }),

  // AI 분석
  analysis: router({
    // 스크린샷 업로드 및 분석
    analyzeScreenshot: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        imageBase64: z.string(), // base64 인코딩된 이미지
      }))
      .mutation(async ({ input }) => {
        // 1. 대화방 정보 조회
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) {
          throw new Error("대화방을 찾을 수 없습니다.");
        }

        // 2. 이미지를 S3에 업로드
        const imageBuffer = Buffer.from(input.imageBase64, 'base64');
        const fileKey = `conversations/${input.conversationId}/screenshots/${nanoid()}.png`;
        const { url: screenshotUrl } = await storagePut(fileKey, imageBuffer, "image/png");

        // 3. OpenAI GPT-4o로 OCR 텍스트 추출
        const ocrResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "당신은 카카오톡 대화 스크린샷에서 텍스트를 추출하는 전문가입니다. 말풍선의 텍스트만 정확하게 추출하고, 시간이나 배터리 표시 등은 제외하세요."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "이 카카오톡 대화 스크린샷에서 대화 내용만 추출해주세요. 각 메시지를 '발신자: 내용' 형식으로 정리해주세요."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: screenshotUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ]
        });

        const extractedText = (typeof ocrResponse.choices[0]?.message?.content === 'string' 
          ? ocrResponse.choices[0]?.message?.content 
          : JSON.stringify(ocrResponse.choices[0]?.message?.content)) || "";

        // 4. 메시지 히스토리에 저장
        await db.addMessageHistory({
          conversationId: input.conversationId,
          screenshotUrl,
          ocrTextRaw: extractedText,
          messageType: "screenshot",
        });

        // 5. 이전 대화 맥락 가져오기
        const previousMessages = await db.getMessageHistoryByConversationId(input.conversationId);
        const contextText = previousMessages
          .slice(-5) // 최근 5개만 사용
          .map(m => m.ocrTextRaw || "")
          .join("\n\n");

        // 6. AI 분석 수행
        const goals = JSON.parse(conversation.goals);
        const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];

        const memorySummary = conversation.contextSummary || "아직 축적된 맥락이 없습니다.";

        // 모드 결정 (관계 유형에 따라)
        const mode: PromptMode = 
          conversation.relationshipType === "직장" ? "work" :
          conversation.relationshipType === "거래" ? "trade" :
          "dating";

        const analysisPrompt = generateAnalysisPrompt({
          mode,
          relationshipType: conversation.relationshipType,
          goals,
          restrictions,
          memorySummary,
          recentMessages: `${contextText}\n\n**새로 추가된 대화**:\n${extractedText}`,
        });

        const analysisResponse = await invokeLLM({
          messages: [
            { role: "user", content: analysisPrompt }
          ]
        });

        // LLM 응답에서 JSON 안전 추출
        const contentStr = typeof analysisResponse.choices[0]?.message?.content === 'string' 
          ? analysisResponse.choices[0]?.message?.content 
          : JSON.stringify(analysisResponse.choices[0]?.message?.content) || "{}";
        
        const analysisResult = safeParseAIResponse(contentStr);
        if (!analysisResult) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "AI 분석에 실패했습니다. 다시 시도해주세요."
          });
        }

        // 7. 분석 결과 저장 (새 JSON 스키마)
        await db.saveAnalysisResult({
          conversationId: input.conversationId,
          outputJson: JSON.stringify(analysisResult),
          inputExcerpt: contextText.slice(0, 500), // 최근 대화 요약
        });

        // 8. 대화방의 메모리 요약 업데이트 (ChatGPT 조언)
        if (analysisResult.updated_memory_summary) {
          await db.updateConversation(input.conversationId, {
            contextSummary: analysisResult.updated_memory_summary,
          });
        }

        return analysisResult;
      }),

    // 톤 변경 재생성 (ChatGPT 플로우)
    regenerateWithTone: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        tone: z.enum(["soft", "balanced", "humor"]),
      }))
      .mutation(async ({ input }) => {
        // 1. 대화방 정보 조회
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) {
          throw new Error("대화방을 찾을 수 없습니다.");
        }

        // 2. 최근 메시지 히스토리 가져오기
        const previousMessages = await db.getMessageHistoryByConversationId(input.conversationId);
        const contextText = previousMessages
          .slice(-5)
          .map(m => m.ocrTextRaw || "")
          .join("\n\n");

        // 3. 프롬프트 생성
        const goals = JSON.parse(conversation.goals);
        const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
        const memorySummary = conversation.contextSummary || "아직 축적된 맥락이 없습니다.";

        const toneInstruction = {
          soft: "부드럽고 공감적인 톤으로 답변하세요.",
          balanced: "균형 잡힌 톤으로 답변하세요.",
          humor: "유머러스하고 가벼운 톤으로 답변하세요."
        };

        const regeneratePrompt = `
당신은 카톡 대화 코칭 전문가입니다. 다음 정보를 바탕으로 **${input.tone} 톤만** 생성해주세요:

**대화방 프로필**:
- 관계: ${conversation.relationshipType}
- 목표: ${goals.join(", ")}
- 금지: ${restrictions.length > 0 ? restrictions.join(", ") : "없음"}

**메모리 요약**:
${memorySummary}

**최근 대화**:
${contextText}

**톤 지침**: ${toneInstruction[input.tone]}

**지침**:
1. 답장은 1~2문장
2. 금지 옵션 엄격히 지키기

다음 JSON 형식으로 응답해주세요:
{
  "one_line_psychology": "상대 심리 1줄 요약",
  "reply": {
    "tone": "${input.tone}",
    "text": "",
    "why": "예상 효과",
    "risk": "주의사항"
  }
}
`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "당신은 연애 대화 분석 및 답변 추천 전문가입니다." },
            { role: "user", content: regeneratePrompt }
          ],
        
        });

        const result = JSON.parse((response.choices[0]?.message?.content as string) || "{}");
        return result;
      }),

    // 맥락 추가 재분석 (ChatGPT 플로우)
    addContextAndReanalyze: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        contextHint: z.string(), // "상황 한 줄 입력"
      }))
      .mutation(async ({ input }) => {
        // 1. 대화방 정보 조회
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) {
          throw new Error("대화방을 찾을 수 없습니다.");
        }

        // 2. 최근 메시지 히스토리 가져오기
        const previousMessages = await db.getMessageHistoryByConversationId(input.conversationId);
        const contextText = previousMessages
          .slice(-5)
          .map(m => m.ocrTextRaw || "")
          .join("\n\n");

        // 3. AI 분석 수행 (추가 맥락 포함)
        const goals = JSON.parse(conversation.goals);
        const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
        const memorySummary = conversation.contextSummary || "아직 축적된 맥락이 없습니다.";

        const reanalysisPrompt = `
당신은 카톡 대화 코칭 전문가입니다. 다음 정보를 바탕으로 분석해주세요:

**대화방 프로필**:
- 관계: ${conversation.relationshipType}
- 목표: ${goals.join(", ")}
- 금지: ${restrictions.length > 0 ? restrictions.join(", ") : "없음"}

**메모리 요약**:
${memorySummary}

**최근 대화**:
${contextText}

**사용자가 추가한 맥락**:
${input.contextHint}

**지침**:
1. 답장은 1~2문장
2. 금지 옵션 엄격히 지키기

다음 JSON 형식으로 응답해주세요:
{
  "one_line_psychology": "상대 심리 1줄 요약",
  "need_more_context": false,
  "context_question": "",
  "replies": [
    {"tone":"soft", "text":"", "why":"예상 효과", "risk":"주의사항"},
    {"tone":"balanced", "text":"", "why":"", "risk":""},
    {"tone":"humor", "text":"", "why":"", "risk":""}
  ],
  "updated_memory_summary": "최신 대화 상황 요약 (1~2문장)"
}
`;

        const analysisResponse = await invokeLLM({
          messages: [
            { role: "system", content: "당신은 연애 대화 분석 및 답변 추천 전문가입니다." },
            { role: "user", content: reanalysisPrompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "talk_caddy_reanalysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  one_line_psychology: { type: "string" },
                  need_more_context: { type: "boolean" },
                  context_question: { type: "string" },
                  replies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tone: { type: "string", enum: ["soft", "balanced", "humor"] },
                        text: { type: "string" },
                        why: { type: "string" },
                        risk: { type: "string" }
                      },
                      required: ["tone", "text", "why", "risk"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  },
                  updated_memory_summary: { type: "string" }
                },
                required: ["one_line_psychology", "need_more_context", "context_question", "replies", "updated_memory_summary"],
                additionalProperties: false
              }
            }
          }
        });

        const analysisResult = JSON.parse((analysisResponse.choices[0]?.message?.content as string) || "{}");

        // 4. 메모리 요약 업데이트
        if (analysisResult.updated_memory_summary) {
          await db.updateConversation(input.conversationId, {
            contextSummary: analysisResult.updated_memory_summary,
          });
        }

        return analysisResult;
      }),

    // 텍스트 복붙 분석
    analyzeText: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        text: z.string().min(10, "최소 10자 이상 입력해주세요"),
      }))
      .mutation(async ({ input }) => {
        // 1. 대화방 정보 조회
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) {
          throw new Error("대화방을 찾을 수 없습니다.");
        }

        // 2. 메시지 히스토리에 저장
        await db.addMessageHistory({
          conversationId: input.conversationId,
          screenshotUrl: null,
          ocrTextRaw: input.text,
          messageType: "text",
        });

        // 3. 이전 대화 맥락 가져오기
        const previousMessages = await db.getMessageHistoryByConversationId(input.conversationId);
        const contextText = previousMessages
          .slice(-5)
          .map(m => m.ocrTextRaw || "")
          .join("\n\n");

        // 4. AI 분석 수행 (새로운 promptTemplates 사용)
        const goals = JSON.parse(conversation.goals);
        const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
        const memorySummary = conversation.memorySummary || "첫 대화입니다.";

        // 관계 유형을 모드로 변환
        const modeMap: Record<string, "dating" | "work" | "trade"> = {
          "썸": "dating",
          "연애": "dating",
          "재회": "dating",
          "직장": "work",
          "거래": "trade",
          "기타": "dating",
        };
        const mode = modeMap[conversation.relationshipType] || "dating";

        // 사용자 프로필 조회 (클라이언트에서 전달받음)
        const userProfile = undefined; // TODO: 클라이언트에서 프로필 전달받기
        
        // 단톡 감지
        const groupChatDetection = detectGroupChat(input.text);
        const groupChatModifier = getGroupChatPromptModifier(groupChatDetection);
        console.log("[analyzeText] 단톡 감지:", groupChatDetection);

        const analysisPrompt = generateAnalysisPrompt({
          mode,
          relationshipType: conversation.relationshipType,
          goals,
          restrictions,
          memorySummary,
          recentMessages: input.text,
          userProfile,
        });

        // 단톡 모드일 때 프롬프트 수정자 추가
        const finalPrompt = groupChatDetection.isGroupChat ? groupChatModifier + analysisPrompt : analysisPrompt;
        const analysisResponse = await invokeLLM({
          messages: [
            { role: "user", content: finalPrompt }
          ]
        });

        // LLM raw response 로깅 (ChatGPT/Gemini 권장)
        const contentStr = analysisResponse?.choices?.[0]?.message?.content ?? "";
        console.error("[analyzeText] content_len=", contentStr.length);
        console.error("[analyzeText] content_head=", contentStr.slice(0, 400));
        console.error("[analyzeText] content_tail=", contentStr.slice(-400));
        
        const rawPreview = JSON.stringify(analysisResponse).slice(0, 4000);
        console.log("[LLM_RAW_PREVIEW]", rawPreview);
        console.log("[LLM_RESPONSE_KEYS]", analysisResponse ? Object.keys(analysisResponse) : "null");

        // BYPASS_AI_VALIDATION 플래그 확인
        const bypass = process.env.BYPASS_AI_VALIDATION === "1";
        const buildTag = process.env.BUILD_TAG || "dev-unknown";
        console.log("[BUILD_TAG]", buildTag);

        let analysisResult;
        
        try {
          console.log("[analyzeText] LLM Response keys:", analysisResponse ? Object.keys(analysisResponse) : "null");
          
          if (!analysisResponse) {
            throw new Error("LLM 응답이 없습니다");
          }
          
          const choices = analysisResponse.choices;
          if (!Array.isArray(choices) || choices.length === 0) {
            console.error("[analyzeText] Invalid choices:", { choices, responseKeys: Object.keys(analysisResponse) });
            throw new Error("LLM 응답 형식이 예상과 다릅니다");
          }
          
          const firstChoice = choices[0];
          if (!firstChoice?.message) {
            throw new Error("LLM 메시지가 없습니다");
          }
          
          const content = firstChoice.message.content;
          if (!content) {
            throw new Error("LLM 응답 내용이 비어있습니다");
          }
          
          const parsedContentStr = typeof content === "string" ? content : JSON.stringify(content);
          
          // 1차 시도: JSON 파싱 (LLM이 JSON으로 응답한 경우)
          let parsedJson = safeParseAIResponse(parsedContentStr);
          
          if (parsedJson && parsedJson.one_line_psychology && parsedJson.replies) {
            // JSON 응답이 유효하면 그대로 사용
            console.log("[analyzeText] JSON 파싱 성공");
            const { AnalysisResultSchema } = await import("./aiValidation");
            analysisResult = AnalysisResultSchema.parse(parsedJson);
          } else {
            // 2차 시도: 텍스트 응답 파싱 (LLM이 마크다운/텍스트로 응답한 경우)
            console.log("[analyzeText] JSON 파싱 실패, 텍스트 파싱 시도");
            const textParsed = parseAnalysisResponse(parsedContentStr);
            
            // 텍스트 파싱 결과 검증
            if (!textParsed.one_line_psychology || textParsed.replies.every(r => !r.text)) {
              console.error("[LLM_RAW_FAIL]", parsedContentStr);
              throw new Error(`AI 응답 형식 오류. (Raw: ${parsedContentStr.slice(0, 100)}...)`);
            }
            
            analysisResult = textParsed;
          }
        } catch (parseError: any) {
          console.error("[analyzeText] Error details:", {
            message: parseError.message,
            responseType: typeof analysisResponse,
          });
          console.error("[LLM_PARSE_FAIL]", parseError);
          console.log("[LLM_RAW_PREVIEW_ON_FAIL]", rawPreview);
          
          // 에러 로깅 (에러 모니터링 시스템)
          await logError({
            errorCode: "LLM_PARSE_FAIL",
            errorMessage: parseError.message,
            location: "analyzeText",
            stackTrace: parseError.stack || "",
            context: {
              content_head: contentStr.slice(0, 200),
              content_tail: contentStr.slice(-200),
            },
            severity: "error",
          });
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: parseError.message || "AI 분석에 실패했습니다. 다시 시도해주세요.",
          });
        }

        // 4.5 스타일 제약 필터 적용
        const styleConstraints: StyleConstraints = {
          noLongMessage: conversation.noLongMessage === true,
          noEmotional: conversation.noEmotional === true,
          forcePolite: conversation.forcePolite === true,
        };
        if (analysisResult?.replies && Object.keys(styleConstraints).some(k => styleConstraints[k as keyof StyleConstraints])) {
          console.log("[analyzeText] 스타일 제약 적용:", styleConstraints);
          analysisResult.replies = enforceStyleBatch(analysisResult.replies, styleConstraints);
        }

        // 5. 분석 결과 저장
        await db.saveAnalysisResult({
          conversationId: input.conversationId,
          outputJson: JSON.stringify(analysisResult),
          inputExcerpt: input.text.slice(0, 500),
        });

        // 6. 메모리 요약 업데이트
        await db.updateConversation(input.conversationId, {
          memorySummary: analysisResult.updated_memory_summary,
        });

        return { 
          ...analysisResult, 
          buildTag, 
          bypassMode: bypass,
          isGroupChat: groupChatDetection.isGroupChat,
          participantCount: groupChatDetection.participantCount,
        } as any;
      }),

    // 최근 분석 결과 조회
    getLatest: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const result = await db.getLatestAnalysisResult(input.conversationId);
        if (!result) return null;

        // outputJson을 파싱하여 반환
        const output = JSON.parse(result.outputJson) as {
          one_line_psychology: string;
          assumption?: string;
          need_more_context?: boolean;
          context_question?: string;
          replies: Array<{ tone: string; text: string; why: string; risk: number | string }>;
          updated_memory_summary?: string;
        };

        // 새로운 형식으로 그대로 반환 (AnalysisResult.tsx와 일치)
        return {
          id: result.id,
          one_line_psychology: output.one_line_psychology,
          assumption: output.assumption || "",
          need_more_context: output.need_more_context || false,
          context_question: output.context_question || "",
          replies: output.replies || [],
          updated_memory_summary: output.updated_memory_summary || "",
          createdAt: result.createdAt,
        };
      }),
  }),

  // 피드백 및 선호도 관리
  feedback: feedbackRouter,
  // 베타 테스트
  beta: betaRouter,
  betaFeedback: betaFeedbackRouter,
  bugClassification: bugClassificationRouter,

  // 구독 관리
  subscription: router({
    // 사용자의 구독 정보 조회
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getSubscriptionByUserId(ctx.user.id);
    }),

    // 구독 생성/업데이트
    update: protectedProcedure
      .input(z.object({
        plan: z.enum(["free", "basic", "premium"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(["active", "expired", "cancelled"]).optional(),
        paymentInfo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createOrUpdateSubscription({
          userId: ctx.user.id,
          plan: input.plan,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status || "active",
          paymentInfo: input.paymentInfo,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
