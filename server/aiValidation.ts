import { z } from "zod";
import { safeParseAIResponse, parseAnalysisResponse } from "./textParser";

/**
 * ChatGPT 검토사항: 프롬프트 출력 검증
 * Zod 스키마로 AI 응답 구조 검증 및 자동 재시도
 * risk 점수 규격화 (0~100): 0~20 안전, 21~40 안전, 41~60 주의, 61~80 위험, 81~100 매우위험
 */

// 답장 톤 타입
export const ReplyToneSchema = z.enum(["soft", "balanced", "humor"]);

// 단일 답장 스키마 (risk 점수 검증 포함)
export const ReplySchema = z.object({
  tone: ReplyToneSchema,
  text: z.string()
    .min(1, "답장 텍스트는 필수입니다")
    .max(110, "답장은 110자 이하여야 합니다 (1~2문장)"),
  why: z.string().min(1, "예상 효과는 필수입니다"),
  risk: z.union([
    z.number().min(0).max(100),
    z.string().regex(/^\d+/, "risk는 숫자로 시작해야 합니다")
  ]).transform((val) => {
    if (typeof val === "number") return val.toString();
    return val;
  }),
});

// AI 분석 결과 전체 스키마
export const AnalysisResultSchema = z.object({
  one_line_psychology: z.string().min(1, "심리 분석은 필수입니다"),
  assumption: z.string().optional().default(""),
  need_more_context: z.boolean(),
  context_question: z.string(),
  replies: z.array(ReplySchema).length(3, "답장은 정확히 3개여야 합니다"),
  updated_memory_summary: z.string().min(1, "메모리 요약은 필수입니다"),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Reply = z.infer<typeof ReplySchema>;
export type ReplyTone = z.infer<typeof ReplyToneSchema>;

/**
 * AI 응답 검증 및 재시도 로직
 * @param rawResponse AI의 원본 응답 (JSON 문자열)
 * @param retryFn 검증 실패 시 재시도 함수
 * @param maxRetries 최대 재시도 횟수
 * @returns 검증된 분석 결과
 */
export async function validateAndRetry(
  rawResponse: string,
  retryFn: () => Promise<string>,
  maxRetries: number = 2
): Promise<AnalysisResult> {
  let attempts = 0;
  let lastError: Error | null = null;
  let lastRawResponse = rawResponse;

  while (attempts <= maxRetries) {
    try {
      // 빈 응답 검사
      if (!rawResponse || rawResponse.trim() === "" || rawResponse === "{}") {
        throw new Error("AI 응답이 비어있습니다.");
      }
      
      // 1차 시도: safeParseAIResponse로 JSON 추출
      let parsed = safeParseAIResponse(rawResponse);
      
      // 2차 시도: JSON 추출 실패 시 텍스트 파서로 폴백
      if (!parsed) {
        console.warn("[AI Validation] JSON 추출 실패, 텍스트 파서로 폴백 시도...");
        const textParsed = parseAnalysisResponse(rawResponse);
        
        // 텍스트 파서 결과 검증
        if (textParsed.one_line_psychology && textParsed.replies.some(r => r.text)) {
          parsed = textParsed;
          console.log("[AI Validation] 텍스트 파서 성공!");
        } else {
          throw new Error("AI 응답에서 JSON을 추출할 수 없습니다.");
        }
      }
      
      // Zod 스키마 검증
      const validated = AnalysisResultSchema.parse(parsed);
      
      return validated;
    } catch (error: any) {
      lastError = error;
      lastRawResponse = rawResponse;
      attempts++;
      
      if (attempts <= maxRetries) {
        console.warn(`[AI Validation] 검증 실패 (${attempts}/${maxRetries}), 재시도 중...`, error.message);
        console.warn(`[AI Validation] 원본 응답 (300자):`, rawResponse.slice(0, 300));
        rawResponse = await retryFn();
      }
    }
  }

  // 모든 재시도 실패 - 마지막으로 텍스트 파서 시도
  console.warn("[AI Validation] 모든 재시도 실패, 최종 텍스트 파서 시도...");
  const finalTextParsed = parseAnalysisResponse(lastRawResponse);
  
  // 최소한의 데이터가 있으면 반환
  if (finalTextParsed.one_line_psychology && finalTextParsed.replies.some(r => r.text)) {
    console.log("[AI Validation] 최종 텍스트 파서 성공!");
    return finalTextParsed as AnalysisResult;
  }

  throw new Error(`AI 응답 검증 실패 (${maxRetries}회 재시도): ${lastError?.message}`);
}

/**
 * 간단한 검증 (재시도 없이)
 */
export function validateAnalysisResult(rawResponse: string): AnalysisResult {
  const parsed = JSON.parse(rawResponse);
  return AnalysisResultSchema.parse(parsed);
}

/**
 * risk 점수 추출 (문자열에서 숫자만 추출)
 */
export function extractRiskScore(riskString: string): number {
  const match = riskString.match(/^(\d+)/);
  if (!match) return 50; // 기본값
  return parseInt(match[1], 10);
}

/**
 * risk 점수를 레벨로 변환
 */
export function getRiskLevel(score: number): "safe" | "caution" | "danger" {
  if (score <= 40) return "safe";
  if (score <= 60) return "caution";
  return "danger";
}
