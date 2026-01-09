/**
 * recommendationEngine.ts - A/B 테스트 추천 로직
 * 
 * 3개 답장 중 현재 상황에 가장 적합한 1개를 추천
 * 추천 이유를 1줄로 제시
 */

export interface RecommendationResult {
  recommendedIndex: number; // 0, 1, 2 중 하나
  reason: string; // 추천 이유 1줄
  confidence: number; // 신뢰도 0-100
}

export interface AnalysisContext {
  affection: number; // 호감도 0-100
  anger: number; // 화남/방어 0-100
  engagement: number; // 관심/몰입 0-100
  distance: number; // 거리감 0-100
  misunderstanding: number; // 오해위험 0-100
  relationshipType: "썸" | "연애" | "재회" | "직장" | "거래" | "기타";
}

export interface ReplyOption {
  tone: "soft" | "balanced" | "humor";
  text: string;
  why: string;
  risk?: string;
}

/**
 * 3개 답장 중 최적 1개 추천
 */
export function recommendBestReply(
  replies: ReplyOption[],
  context: AnalysisContext
): RecommendationResult {
  if (replies.length < 3) {
    return {
      recommendedIndex: 1, // 기본값: 균형잡힌 톤
      reason: "균형잡힌 톤이 대부분의 상황에서 무난합니다.",
      confidence: 50,
    };
  }

  const scores = replies.map((reply, index) =>
    calculateReplyScore(reply, index, context)
  );

  // 가장 높은 점수의 인덱스 찾기
  const maxScore = Math.max(...scores);
  const recommendedIndex = scores.indexOf(maxScore);

  // 추천 이유 생성
  const reason = generateRecommendationReason(
    recommendedIndex,
    replies[recommendedIndex],
    context,
    maxScore
  );

  // 신뢰도 계산 (0-100)
  const confidence = Math.min(
    100,
    Math.round((maxScore / 100) * 100)
  );

  return {
    recommendedIndex,
    reason,
    confidence,
  };
}

/**
 * 각 답장의 점수 계산
 */
function calculateReplyScore(
  reply: ReplyOption,
  index: number,
  context: AnalysisContext
): number {
  let score = 50; // 기본 점수

  // 톤별 가중치
  if (reply.tone === "soft") {
    // 부드럽게: 호감도가 낮거나 거리감이 클 때 좋음
    score += context.affection < 50 ? 20 : 10;
    score += context.distance > 50 ? 20 : 0;
  } else if (reply.tone === "balanced") {
    // 균형: 안정적이고 무난함
    score += 15;
    score += context.misunderstanding > 50 ? 20 : 10;
  } else if (reply.tone === "humor") {
    // 유머: 호감도가 높고 분위기가 좋을 때
    score += context.affection > 70 ? 20 : 5;
    score += context.engagement > 70 ? 15 : 0;
  }

  // 관계 타입별 가중치
  if (context.relationshipType === "직장" || context.relationshipType === "거래") {
    // 업무/거래: 균형잡힌 톤 선호
    if (reply.tone === "balanced") score += 15;
    if (reply.tone === "humor") score -= 10;
  } else if (context.relationshipType === "썸" || context.relationshipType === "연애") {
    // 썸/연애: 부드럽거나 유머있는 톤 선호
    if (reply.tone === "soft" || reply.tone === "humor") score += 10;
  }

  // 리스크 감소 가중치
  if (!reply.risk) {
    score += 10; // 리스크 없으면 가산점
  }

  // 오해위험이 높으면 안전한 톤 선호
  if (context.misunderstanding > 70) {
    if (reply.tone === "balanced") score += 20;
    if (reply.tone === "humor") score -= 15;
  }

  // 화남/방어가 높으면 부드러운 톤 선호
  if (context.anger > 60) {
    if (reply.tone === "soft") score += 20;
    if (reply.tone === "humor") score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 추천 이유 생성 (1줄)
 */
function generateRecommendationReason(
  index: number,
  reply: ReplyOption,
  context: AnalysisContext,
  score: number
): string {
  const reasons: string[] = [];

  // 톤 기반 이유
  if (reply.tone === "soft") {
    reasons.push("부드러운 톤으로 거리감을 좁힐 수 있습니다");
  } else if (reply.tone === "balanced") {
    reasons.push("균형잡힌 톤이 가장 안전합니다");
  } else if (reply.tone === "humor") {
    reasons.push("유머로 분위기를 밝게 만들 수 있습니다");
  }

  // 상황 기반 이유
  if (context.misunderstanding > 70) {
    reasons.push("오해 위험이 낮습니다");
  }
  if (context.affection > 70) {
    reasons.push("호감도를 유지합니다");
  }
  if (context.anger > 60) {
    reasons.push("상대의 감정을 존중합니다");
  }

  // 관계 타입 기반 이유
  if (context.relationshipType === "직장" || context.relationshipType === "거래") {
    reasons.push("업무 관계에 적합합니다");
  }

  // 가장 관련있는 이유 1개 선택
  if (reasons.length > 0) {
    return reasons[0];
  }

  return "현재 상황에 가장 적합합니다";
}

/**
 * 추천 신뢰도 배지 텍스트
 */
export function getConfidenceBadge(confidence: number): string {
  if (confidence >= 80) return "매우 추천";
  if (confidence >= 60) return "추천";
  if (confidence >= 40) return "무난";
  return "참고";
}

/**
 * 추천 신뢰도 색상
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-green-100 text-green-700";
  if (confidence >= 60) return "bg-blue-100 text-blue-700";
  if (confidence >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}
