import { invokeLLM } from "./_core/llm";
import type { BetaFeedbackItem } from "./betaFeedback";
import { z } from "zod";

/**
 * AI 기반 버그 분류 및 우선순위 지정
 * P4: LLM JSON 파싱 try/catch + 검증 강화
 */

// Zod 스키마로 런타임 검증
const ClassificationSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  impact: z.enum(["low", "medium", "high"]),
  effort: z.enum(["low", "medium", "high"]),
  category: z.string().min(1).max(100),
  suggestedAction: z.string().min(1).max(200),
  estimatedFix: z.string().min(1).max(100),
});

interface ClassificationResult {
  severity: "low" | "medium" | "high" | "critical";
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  category: string;
  suggestedAction: string;
  estimatedFix: string; // "1시간", "1일", "1주", "1개월"
}

/**
 * AI를 사용하여 버그 분류
 * P4: 재시도 로직 + 검증 강화
 */
export async function classifyBugWithAI(
  feedback: BetaFeedbackItem,
  retryCount: number = 1
): Promise<ClassificationResult> {
  const prompt = `
당신은 소프트웨어 버그 분류 전문가입니다. 다음 버그 리포트를 분석하고 분류해주세요:

**제목**: ${feedback.title}
**설명**: ${feedback.description}
**재현 가능**: ${feedback.reproducible ? "예" : "아니오"}
**재현 단계**: ${feedback.reproductionSteps || "없음"}
**기기 정보**: ${feedback.deviceInfo || "없음"}

다음 기준으로 분석해주세요:

1. **심각도 (Severity)**: 사용자 영향도
   - critical: 앱 크래시, 데이터 손실, 보안 문제
   - high: 주요 기능 불가, 심각한 성능 저하
   - medium: 일부 기능 불완전, 사용성 문제
   - low: 미미한 UI 오류, 텍스트 오류

2. **영향도 (Impact)**: 영향받는 사용자 수
   - high: 모든 사용자 또는 대다수
   - medium: 특정 사용자 그룹
   - low: 소수 사용자

3. **해결 난이도 (Effort)**: 수정에 필요한 시간
   - low: 1시간 이내
   - medium: 1-3일
   - high: 1주 이상

4. **카테고리**: 버그의 분류
   - UI/UX, Performance, Security, Data, API, Authentication, etc.

5. **권장 조치**: 즉시 조치 필요 여부
   - Immediate: 즉시 수정 필요
   - High Priority: 다음 릴리스에 포함
   - Backlog: 향후 고려

다음 JSON 형식으로 응답해주세요:
{
  "severity": "critical|high|medium|low",
  "impact": "high|medium|low",
  "effort": "low|medium|high",
  "category": "카테고리명",
  "suggestedAction": "권장 조치",
  "estimatedFix": "예상 수정 시간"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "당신은 소프트웨어 버그 분류 전문가입니다. JSON 형식으로만 응답하세요.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bug_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              category: { type: "string" },
              suggestedAction: { type: "string" },
              estimatedFix: { type: "string" },
            },
            required: [
              "severity",
              "impact",
              "effort",
              "category",
              "suggestedAction",
              "estimatedFix",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    // P4: 응답 검증
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error("Invalid LLM response structure");
    }

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("LLM response content is not a string");
    }

    // P0-2: 마크다운 코드 블록 제거 및 JSON 파싱
    let result: any;
    try {
      // 1. 마크다운 코드 블록 제거 (```json ... ```)
      const cleanJson = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      
      // 2. JSON 파싱
      result = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[Bug Classification] JSON parse error:", parseError, "Content:", content);
      throw new Error(`JSON parse failed: ${String(parseError)}`);
    }

    // P4: 스키마 검증
    const validationResult = ClassificationSchema.safeParse(result);
    if (!validationResult.success) {
      console.error("[Bug Classification] Schema validation failed:", validationResult.error);
      throw new Error(`Schema validation failed: ${validationResult.error.message}`);
    }

    return validationResult.data as ClassificationResult;
  } catch (error) {
    console.error(`[Bug Classification] AI 분류 실패 (시도 ${retryCount}/2):`, error);

    // P4: 1회 재시도
    if (retryCount < 2) {
      console.log("[Bug Classification] Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
      return classifyBugWithAI(feedback, retryCount + 1);
    }

    // 폴백: 기본 분류
    console.warn("[Bug Classification] Using fallback classification");
    return getDefaultClassification(feedback);
  }
}

/**
 * 기본 분류 (AI 없을 때 폴백)
 */
function getDefaultClassification(
  feedback: BetaFeedbackItem
): ClassificationResult {
  const title = feedback.title.toLowerCase();
  const description = feedback.description.toLowerCase();
  const text = `${title} ${description}`;

  let severity: "low" | "medium" | "high" | "critical" = "medium";
  let category = "General";

  // 심각도 판정
  if (
    text.includes("crash") ||
    text.includes("크래시") ||
    text.includes("security") ||
    text.includes("보안")
  ) {
    severity = "critical";
  } else if (
    text.includes("error") ||
    text.includes("fail") ||
    text.includes("오류") ||
    text.includes("실패")
  ) {
    severity = "high";
  } else if (
    text.includes("slow") ||
    text.includes("lag") ||
    text.includes("느림")
  ) {
    severity = "medium";
  } else if (
    text.includes("typo") ||
    text.includes("ui") ||
    text.includes("오타")
  ) {
    severity = "low";
  }

  // 카테고리 판정
  if (text.includes("ui") || text.includes("버튼") || text.includes("화면")) {
    category = "UI/UX";
  } else if (
    text.includes("performance") ||
    text.includes("slow") ||
    text.includes("성능")
  ) {
    category = "Performance";
  } else if (
    text.includes("security") ||
    text.includes("auth") ||
    text.includes("보안")
  ) {
    category = "Security";
  } else if (
    text.includes("data") ||
    text.includes("save") ||
    text.includes("데이터")
  ) {
    category = "Data";
  } else if (text.includes("api") || text.includes("network")) {
    category = "API";
  }

  const effortMap = {
    critical: "high",
    high: "medium",
    medium: "low",
    low: "low",
  } as const;

  return {
    severity,
    impact: severity === "critical" ? "high" : "medium",
    effort: effortMap[severity],
    category,
    suggestedAction:
      severity === "critical"
        ? "Immediate"
        : severity === "high"
          ? "High Priority"
          : "Backlog",
    estimatedFix:
      severity === "critical"
        ? "1시간"
        : severity === "high"
          ? "1-3일"
          : "1주",
  };
}

/**
 * 우선순위 점수 계산 (심각도, 영향도, 재현 가능성 기반)
 */
export function calculatePriorityScore(
  classification: ClassificationResult,
  reproducible: boolean
): number {
  let score = 0;

  // 심각도 (0-50점)
  const severityScores = {
    critical: 50,
    high: 30,
    medium: 15,
    low: 5,
  };
  score += severityScores[classification.severity];

  // 영향도 (0-30점)
  const impactScores = {
    high: 30,
    medium: 15,
    low: 5,
  };
  score += impactScores[classification.impact];

  // 해결 난이도 (낮을수록 높은 점수, 0-20점)
  const effortScores = {
    low: 20,
    medium: 10,
    high: 5,
  };
  score += effortScores[classification.effort];

  // 재현 가능성 (0-10점)
  if (reproducible) {
    score += 10;
  }

  return Math.min(score, 100); // 최대 100점
}

/**
 * 유사 버그 찾기 (제목 기반)
 */
export function findSimilarBugs(
  feedback: BetaFeedbackItem,
  allFeedbacks: BetaFeedbackItem[],
  threshold: number = 0.6
): BetaFeedbackItem[] {
  const keywords = feedback.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  return allFeedbacks.filter((f) => {
    if (f.id === feedback.id) return false;
    if (f.feedbackType !== "bug") return false;

    const fKeywords = f.title.toLowerCase().split(/\s+/);
    const matches = keywords.filter((k) => fKeywords.some((fk) => fk.includes(k)));
    const similarity = matches.length / Math.max(keywords.length, fKeywords.length);

    return similarity >= threshold;
  });
}
