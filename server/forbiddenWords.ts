/**
 * forbiddenWords.ts - 금칙어 및 리스크 표현 감지
 * 
 * 거래/업무 관계에서 위험한 표현을 감지하고 경고 제공
 * 규칙 기반으로 LLM 없이 동작
 */

export interface RiskAnalysis {
  hasRisk: boolean;
  riskLevel: "low" | "medium" | "high";
  warnings: Array<{
    type: "forbidden_word" | "aggressive_tone" | "too_long" | "ambiguous" | "unclear_commitment";
    message: string;
    examples?: string[];
  }>;
  recommendation?: string;
}

/**
 * 거래/업무용 금칙어 리스트
 */
const FORBIDDEN_WORDS: Record<string, string[]> = {
  trade: [
    // 거래 관계에서 위험한 표현
    "환불 불가",
    "고소",
    "법적",
    "증거",
    "기록",
    "책임",
    "손해배상",
    "위약금",
    "취소 불가",
    "변경 불가",
    "일방적",
  ],
  work: [
    // 업무 관계에서 위험한 표현
    "책임 전가",
    "당신 잡명",
    "너 때문",
    "할 수 없어",
    "모르겠어",
    "나중에",
    "일단",
    "대충",
    "아무튜",
    "뛈어",
  ],
  dating: [],
};

/**
 * 공격적인 표현 패턴
 */
const AGGRESSIVE_PATTERNS = [
  /[!！]{3,}/g, // 연속 느낌표 3개 이상
  /[?？]{3,}/g, // 연속 물음표 3개 이상
  /\*\*[^*]+\*\*/g, // 강조 표현
  /[A-Z]{3,}/g, // 연속 대문자 3개 이상
];

/**
 * 모호한 표현 패턴
 */
const AMBIGUOUS_PATTERNS = [
  /아마도/,
  /아무래도/,
  /혹시/,
  /혹은/,
  /또는/,
  /어쌌면/,
  /그런 것 같/,
  /인 것 같/,
];

/**
 * 약속/확약 부재 패턴
 */
const UNCLEAR_COMMITMENT_PATTERNS = [
  /해볼게/,
  /노력해볼게/,
  /생각해볼게/,
  /알아봐야겠어/,
  /확인해봐야겠어/,
  /나중에 연락할게/,
  /나중에 얘기하자/,
  /그때 되면/,
  /그때 보자/,
];

/**
 * 답장 텍스트의 리스크 분석
 */
export function analyzeReplyRisk(
  replyText: string,
  relationshipType: "trade" | "work" | "dating" = "work"
): RiskAnalysis {
  const warnings: RiskAnalysis["warnings"] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  // 1. 금칙어 감지
  const forbiddenList = FORBIDDEN_WORDS[relationshipType] || [];
  for (const word of forbiddenList) {
    if (replyText.includes(word)) {
      warnings.push({
        type: "forbidden_word",
        message: `위험한 표현 감지: "${word}"`,
      });
      riskLevel = "high";
    }
  }

  // 2. 공격적인 톤 감지
  let aggressiveCount = 0;
  for (const pattern of AGGRESSIVE_PATTERNS) {
    const matches = replyText.match(pattern);
    if (matches) {
      aggressiveCount += matches.length;
    }
  }
  if (aggressiveCount > 0) {
    warnings.push({
      type: "aggressive_tone",
      message: "너무 공격적인 톤으로 느껴질 수 있습니다.",
    });
    if (riskLevel === "low") riskLevel = "medium";
  }

  // 3. 길이 체크 (거래/업무: 110자 이상이면 주의)
  if (relationshipType !== "dating" && replyText.length > 110) {
    warnings.push({
      type: "too_long",
      message: `답장이 너무 깁니다 (${replyText.length}자). 간결하게 정리하는 것이 좋습니다.`,
    });
    if (riskLevel === "low") riskLevel = "medium";
  }

  // 4. 모호한 표현 감지 (거래/업무에서 특히 위험)
  if (relationshipType === "trade" || relationshipType === "work") {
    for (const pattern of AMBIGUOUS_PATTERNS) {
      if (pattern.test(replyText)) {
        warnings.push({
          type: "ambiguous",
          message: "모호한 표현이 있습니다. 명확하게 의도를 전달하세요.",
        });
        if (riskLevel === "low") riskLevel = "medium";
        break;
      }
    }
  }

  // 5. 약속/확약 부재 감지 (거래에서 특히 위험)
  if (relationshipType === "trade") {
    for (const pattern of UNCLEAR_COMMITMENT_PATTERNS) {
      if (pattern.test(replyText)) {
        warnings.push({
          type: "unclear_commitment",
          message: "명확한 약속이나 확약이 없습니다. 구체적인 일정/조건을 명시하세요.",
        });
        riskLevel = "high";
        break;
      }
    }
  }

  // 추천 메시지 생성
  let recommendation: string | undefined;
  if (riskLevel === "high") {
    recommendation = "한 번 더 검토하고 보내는 것을 추천합니다.";
  } else if (riskLevel === "medium") {
    recommendation = "약간의 수정을 고려해보세요.";
  }

  return {
    hasRisk: warnings.length > 0,
    riskLevel,
    warnings,
    recommendation,
  };
}

/**
 * 리스크 레벨을 색상으로 표현
 */
export function getRiskColor(riskLevel: "low" | "medium" | "high"): string {
  switch (riskLevel) {
    case "high":
      return "bg-red-100 text-red-700 border-red-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "low":
    default:
      return "bg-green-100 text-green-700 border-green-300";
  }
}

/**
 * 리스크 아이콘 반환
 */
export function getRiskIcon(riskLevel: "low" | "medium" | "high"): string {
  switch (riskLevel) {
    case "high":
      return "🚨";
    case "medium":
      return "⚠️";
    case "low":
    default:
      return "✓";
  }
}
