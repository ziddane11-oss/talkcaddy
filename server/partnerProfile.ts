/**
 * partnerProfile.ts - 상대 성향 자동 추정
 * 
 * 대화 패턴을 분석해서 상대방의 성향을 자동 감지
 * 단답형/감정형/팩트형/회피형 중 하나로 분류
 */

export type PartnerStyle = "short-answer" | "emotional" | "factual" | "avoidant";

export interface PartnerProfile {
  style: PartnerStyle;
  confidence: number; // 0-100
  characteristics: string[];
  recommendedTone: "soft" | "balanced" | "humor";
  description: string;
}

/**
 * 상대 성향 분석
 */
export function analyzePartnerProfile(recentMessages: string): PartnerProfile {
  const messages = recentMessages.split("\n").filter(m => m.trim());
  
  // 메시지 길이 분석
  const avgLength = messages.reduce((sum, m) => sum + m.length, 0) / messages.length;
  const shortAnswerCount = messages.filter(m => m.length < 30).length;
  const shortAnswerRatio = shortAnswerCount / messages.length;

  // 감정 표현 분석
  const emotionalPatterns = [
    /[ㅋㅎㅠㅡ]+/g, // 이모티콘
    /[!?]{2,}/g, // 연속 느낌표/물음표
    /\.\.\./g, // 말줄임표
    /ㅠㅠ|ㅋㅋ|ㅎㅎ|ㅜㅜ/g, // 감정 표현
    /정말|너무|진짜|완전/g, // 강조 표현
  ];
  const emotionalCount = emotionalPatterns.reduce((sum, pattern) => {
    const matches = recentMessages.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  const emotionalRatio = emotionalCount / messages.length;

  // 팩트 표현 분석
  const factualPatterns = [
    /\d+/g, // 숫자
    /시간|날짜|시간|요일/g, // 시간 관련
    /확인|확실|정확|분명/g, // 확실성 표현
    /그런데|하지만|그러나/g, // 논리 연결어
    /왜냐하면|이유는/g, // 이유 설명
  ];
  const factualCount = factualPatterns.reduce((sum, pattern) => {
    const matches = recentMessages.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  const factualRatio = factualCount / messages.length;

  // 회피 표현 분석
  const avoidantPatterns = [
    /모르겠어|잘모르겠어|뭐라고|뭐해/g, // 회피
    /나중에|다음에|언제|언젠가/g, // 미루기
    /아무튼|어쨌든|뭐어쨌든/g, // 넘어가기
    /그냥|그렇고|뭐/g, // 무관심
  ];
  const avoidantCount = avoidantPatterns.reduce((sum, pattern) => {
    const matches = recentMessages.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  const avoidantRatio = avoidantCount / messages.length;

  // 성향 판단
  let style: PartnerStyle;
  let confidence: number;
  const characteristics: string[] = [];
  let recommendedTone: "soft" | "balanced" | "humor";
  let description: string;

  if (shortAnswerRatio > 0.6) {
    style = "short-answer";
    confidence = Math.min(100, shortAnswerRatio * 100);
    characteristics.push("짧은 답변 선호", "효율적인 소통");
    recommendedTone = "balanced";
    description = "단답형: 효율적이고 직설적인 소통을 선호합니다. 간결한 답변이 좋습니다.";
  } else if (emotionalRatio > 0.3) {
    style = "emotional";
    confidence = Math.min(100, emotionalRatio * 100);
    characteristics.push("감정 표현 풍부", "공감 중시", "감정적 연결");
    recommendedTone = "soft";
    description = "감정형: 감정 표현이 풍부하고 공감을 중시합니다. 따뜻하고 공감적인 톤이 좋습니다.";
  } else if (factualRatio > 0.2) {
    style = "factual";
    confidence = Math.min(100, factualRatio * 100);
    characteristics.push("논리적 사고", "정보 중시", "명확한 설명");
    recommendedTone = "balanced";
    description = "팩트형: 논리적이고 정보를 중시합니다. 명확하고 근거있는 답변이 좋습니다.";
  } else if (avoidantRatio > 0.15) {
    style = "avoidant";
    confidence = Math.min(100, avoidantRatio * 100);
    characteristics.push("회피 경향", "미루는 습관", "무관심");
    recommendedTone = "humor";
    description = "회피형: 직설적인 주제를 피하는 경향이 있습니다. 가볍고 유머있는 톤으로 접근하세요.";
  } else {
    // 기본값: 균형잡힌 성향
    style = "emotional"; // 기본은 감정형
    confidence = 30;
    characteristics.push("일반적인 소통 패턴");
    recommendedTone = "balanced";
    description = "일반형: 특정 성향이 강하지 않습니다. 균형잡힌 톤이 좋습니다.";
  }

  return {
    style,
    confidence,
    characteristics,
    recommendedTone,
    description,
  };
}

/**
 * 성향별 톤 추천
 */
export function getRecommendedTone(style: PartnerStyle): "soft" | "balanced" | "humor" {
  const toneMap: Record<PartnerStyle, "soft" | "balanced" | "humor"> = {
    "short-answer": "balanced",
    "emotional": "soft",
    "factual": "balanced",
    "avoidant": "humor",
  };
  return toneMap[style];
}

/**
 * 성향 설명 (UI용)
 */
export function getPartnerStyleLabel(style: PartnerStyle): string {
  const labels: Record<PartnerStyle, string> = {
    "short-answer": "📝 단답형",
    "emotional": "💭 감정형",
    "factual": "📊 팩트형",
    "avoidant": "🚫 회피형",
  };
  return labels[style];
}

/**
 * 성향 색상 (UI용)
 */
export function getPartnerStyleColor(style: PartnerStyle): string {
  const colors: Record<PartnerStyle, string> = {
    "short-answer": "bg-blue-100 text-blue-700",
    "emotional": "bg-pink-100 text-pink-700",
    "factual": "bg-green-100 text-green-700",
    "avoidant": "bg-gray-100 text-gray-700",
  };
  return colors[style];
}
