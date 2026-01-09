import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import { parseOcrText, generateMessageHash, type ParsedMessage } from "./messageParser";
import { generateAnalysisPrompt, type PromptMode } from "./promptTemplates";
import { validateAndRetry } from "./aiValidation";
import { maskSensitiveInfo } from "./privacyMasking";
import { ApiError, ERROR_CODES } from "./errorCodes";
import { createHash } from "crypto";

/**
 * ChatGPT 검토사항: analyzeScreenshot 단계화
 * presign → ocr → ingest → generate 파이프라인
 */
export const pipelineRouter = router({
  // Step 1: 업로드 생성 및 presign URL 반환
  createUpload: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const uploadId = await db.createUpload({
        conversationId: input.conversationId,
        status: "pending",
      });
      return { uploadId };
    }),

  // Step 2: OCR 실행 (이미지 업로드 후)
  runOcr: protectedProcedure
    .input(z.object({
      uploadId: z.number(),
      imageBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const upload = await db.getUploadById(input.uploadId);
        if (!upload) {
          throw new ApiError(ERROR_CODES.UPLOAD_NOT_FOUND);
        }

        // 1. 이미지를 S3에 업로드
        const imageBuffer = Buffer.from(input.imageBase64, 'base64');
        const fileKey = `conversations/${upload.conversationId}/screenshots/${nanoid()}.png`;
        const { url: screenshotUrl } = await storagePut(fileKey, imageBuffer, "image/png");

        // 2. OpenAI GPT-4o로 OCR 텍스트 추출
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

        // OCR 응답 안전 처리
        if (!ocrResponse?.choices || ocrResponse.choices.length === 0) {
          throw new ApiError(ERROR_CODES.MODEL_ERROR, "OCR 응답이 비어있습니다.");
        }
        
        const messageContent = ocrResponse.choices[0]?.message?.content;
        const ocrTextRaw = (typeof messageContent === 'string' 
          ? messageContent 
          : messageContent ? JSON.stringify(messageContent) : "");

        // OCR 결과 검증
        if (!ocrTextRaw || ocrTextRaw.trim().length === 0) {
          throw new ApiError(ERROR_CODES.OCR_EMPTY);
        }

        // 3. 업로드 상태 업데이트
        await db.updateUpload(input.uploadId, {
          screenshotUrl,
          ocrTextRaw,
          status: "ocr_done",
        });

        return { 
          uploadId: input.uploadId, 
          ocrTextRaw,
          screenshotUrl,
        };
      } catch (error: any) {
        // OCR 실패 시 에러 코드 저장
        const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.MODEL_ERROR;
        await db.updateUpload(input.uploadId, {
          status: "pending",
          errorMessage: error.message || "OCR 실패",
          errorCode,
        });
        throw error;
      }
    }),

  // Step 3: OCR 결과 파싱 및 중복 제거 (ingest)
  ingestOcr: protectedProcedure
    .input(z.object({
      uploadId: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const upload = await db.getUploadById(input.uploadId);
        if (!upload) {
          throw new ApiError(ERROR_CODES.UPLOAD_NOT_FOUND);
        }
        if (!upload.ocrTextRaw) {
          throw new ApiError(ERROR_CODES.OCR_EMPTY);
        }

        // 1. OCR 텍스트 파싱 (speaker 구분)
        const parsedMessages = parseOcrText(upload.ocrTextRaw);
        
        // 2. 기존 메시지 해시 가져오기
        const existingHashes = await db.getExistingMessageHashes(upload.conversationId);

        // 3. 중복 제거 및 새 메시지만 저장
        const newMessages = parsedMessages.filter(msg => {
          const hash = generateMessageHash(msg.speaker, msg.content);
          return !existingHashes.has(hash);
        });

        for (const msg of newMessages as ParsedMessage[]) {
          await db.addMessage({
            conversationId: upload.conversationId,
            speaker: msg.speaker,
            content: msg.content,
            source: "ocr",
            hash: generateMessageHash(msg.speaker, msg.content),
          });
        }

        // 4. 업로드 상태 업데이트
        await db.updateUpload(input.uploadId, {
          ocrParsedJson: JSON.stringify(parsedMessages),
          status: "ingested",
        });

        // 5. messageHistory에도 저장 (기존 호환성)
        await db.addMessageHistory({
          conversationId: upload.conversationId,
          screenshotUrl: upload.screenshotUrl || "",
          ocrTextRaw: upload.ocrTextRaw,
          ocrParsedJson: JSON.stringify(parsedMessages),
          messageType: "screenshot",
        });

        return { 
          uploadId: input.uploadId, 
          newMessageCount: newMessages.length,
          totalMessageCount: parsedMessages.length,
        };
      } catch (error: any) {
        const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.INVALID_RESPONSE;
        await db.updateUpload(input.uploadId, {
          status: "ocr_done",
          errorMessage: error.message || "파싱 실패",
          errorCode,
        });
        throw error;
      }
    }),

  // Step 4: AI 답변 생성 (generate)
  generateReplies: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      uploadId: z.number().optional(),
      imageBase64: z.string().optional(), // 캐시 키 생성용
    }))
    .mutation(async ({ input }) => {
      try {
        // 1. 대화방 정보 조회
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation) {
          throw new ApiError(ERROR_CODES.CONVERSATION_NOT_FOUND);
        }

        // 2. 최근 메시지 가져오기 (messages 테이블에서)
        const recentMessages = await db.getRecentMessagesByConversationId(input.conversationId, 30);
        
        // 메시지가 없으면 에러
        if (!recentMessages || recentMessages.length === 0) {
          throw new ApiError(ERROR_CODES.OCR_EMPTY, "분석할 대화 내용이 없습니다. 스크린샷을 다시 업로드해주세요.");
        }
        
        // 3. 개인정보 마스킹
        const allDetectedTypes = new Set<string>();
        const maskedMessages = recentMessages.map((m: any) => {
          const maskResult = maskSensitiveInfo(m.content);
          maskResult.detectedTypes.forEach(type => allDetectedTypes.add(type));
          return {
            speaker: m.speaker,
            content: maskResult.maskedText,
          };
        });
        
        const contextText = maskedMessages
          .map((m: any) => `${m.speaker === "me" ? "나" : "상대"}: ${m.content}`)
          .join("\n");

        // 4. 캐시 키 생성 (imageBase64 기반)
        let imageHash: string | null = null;
        if (input.imageBase64) {
          const imageBuffer = Buffer.from(input.imageBase64, 'base64');
          imageHash = createHash('sha256').update(imageBuffer).digest('hex');
          
          // 캐시 조회
          const cachedResult = await db.getCachedAnalysisByImageHash(imageHash);
          if (cachedResult) {
            console.log(`[Cache] HIT: imageHash=${imageHash}`);
            
            // 업로드 상태 업데이트 (캐시 적중)
            if (input.uploadId) {
              await db.updateUpload(input.uploadId, {
                status: "analyzed",
              });
            }
            
            // 캐시된 결과 반환
            const analysisResult = JSON.parse(cachedResult);
            return {
              ...analysisResult,
              privacyMasking: {
                hasSensitiveInfo: allDetectedTypes.size > 0,
                detectedTypes: Array.from(allDetectedTypes),
              },
              _cacheHit: true, // 클라이언트에서 캐시 적중 여부 확인 가능
            };
          }
        }

        // 3. AI 분석 수행
        const goals = JSON.parse(conversation.goals);
        const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
        const memorySummary = conversation.contextSummary || "아직 축적된 맥락이 없습니다.";

        // 모드 결정
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
          recentMessages: contextText,
        });

        // AI 호출 함수 (재시도용)
        const callAI = async (): Promise<string> => {
          const response = await invokeLLM({
            messages: [
              { role: "user", content: analysisPrompt }
            ]
          });
          
          // 응답 안전 처리
          if (!response?.choices || response.choices.length === 0) {
            throw new ApiError(ERROR_CODES.MODEL_ERROR, "LLM 응답이 비어있습니다.");
          }
          
          const messageContent = response.choices[0]?.message?.content;
          if (!messageContent) {
            throw new ApiError(ERROR_CODES.MODEL_ERROR, "LLM 응답 내용이 없습니다.");
          }
          
          return typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
        };

        // 초기 AI 호출
        const rawResponse = await callAI();

        // Zod 스키마 검증 및 재시도
        const analysisResult = await validateAndRetry(rawResponse, callAI, 2);

        // 5. 분석 결과 저장
        await db.saveAnalysisResult({
          conversationId: input.conversationId,
          outputJson: JSON.stringify(analysisResult),
          inputExcerpt: contextText.slice(0, 500),
        });
        
        // 6. 캐시에 저장 (imageHash 기반)
        if (imageHash) {
          try {
            await db.saveCachedAnalysis(imageHash, JSON.stringify(analysisResult));
            console.log(`[Cache] SAVED: imageHash=${imageHash}`);
          } catch (cacheError) {
            console.warn("[Cache] Failed to save cache:", cacheError);
            // 캐시 저장 실패는 무시하고 계속 진행
          }
        }

        // 7. 메모리 요약 업데이트
        if (analysisResult.updated_memory_summary) {
          await db.updateConversation(input.conversationId, {
            contextSummary: analysisResult.updated_memory_summary,
          });
        }

        // 8. 업로드 상태 업데이트 (uploadId가 있는 경우)
        if (input.uploadId) {
          await db.updateUpload(input.uploadId, {
            status: "analyzed",
          });
        }

        return {
          ...analysisResult,
          privacyMasking: {
            hasSensitiveInfo: allDetectedTypes.size > 0,
            detectedTypes: Array.from(allDetectedTypes),
          },
        };
      } catch (error: any) {
        const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.MODEL_ERROR;
        if (input.uploadId) {
          await db.updateUpload(input.uploadId, {
            status: "ingested",
            errorMessage: error.message || "AI 분석 실패",
            errorCode,
          });
        }
        throw error;
      }
    }),

  // 업로드 상태 조회
  getUploadStatus: protectedProcedure
    .input(z.object({
      uploadId: z.number(),
    }))
    .query(async ({ input }) => {
      const upload = await db.getUploadById(input.uploadId);
      if (!upload) {
        throw new Error("업로드를 찾을 수 없습니다.");
      }
      return upload;
    }),
});
