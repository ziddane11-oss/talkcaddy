/**
 * styleRecommendation.ts - 프로필 기반 추천 로직
 * 
 * 프로필과 현재 답장의 유사도를 계산해서 추천 배지 표시
 */

import type { ReplyFeatures } from "./styleProfileFeatures";
import type { ModeProfile, PromptMode } from "./styleProfileManager";
import { getModeProfile } from "./styleProfileManager";

/**
 * 답장 특징을 점수로 변환
 */
function featuresToScore(features: ReplyFeatures): Record<string, number> {
  return {
    length_short: features.length === "short" ? 1 : 0,
    length_medium: features.length === "medium" ? 1 : 0,
    length_long: features.length === "long" ? 1 : 0,
    tone_polite: features.tone === "polite" ? 1 : 0,
    tone_casual: features.tone === "casual" ? 1 : 0,
    emoji_low: features.emoji === "low" ? 1 : 0,
    emoji_mid: features.emoji === "mid" ? 1 : 0,
    emoji_high: features.emoji === "high" ? 1 : 0,
    directness_soft: features.directness === "soft" ? 1 : 0,
    directness_neutral: features.directness === "neutral" ? 1 : 0,
    directness_direct: features.directness === "direct" ? 1 : 0,
    structure_question: features.structure === "question" ? 1 : 0,
    structure_statement: features.structure === "statement" ? 1 : 0,
    structure_mixed: features.structure === "mixed" ? 1 : 0,
  };
}

/**
 * 프로필 점수 생성
 */
function profileToScore(profile: ModeProfile): Record<string, number> {
  return {
    length_short: profile.length.short,
    length_medium: profile.length.medium,
    length_long: profile.length.long,
    tone_polite: profile.tone.polite,
    tone_casual: profile.tone.casual,
    emoji_low: profile.emoji.low,
    emoji_mid: profile.emoji.mid,
    emoji_high: profile.emoji.high,
    directness_soft: profile.directness.soft,
    directness_neutral: profile.directness.neutral,
    directness_direct: profile.directness.direct,
    structure_question: profile.structure.question,
    structure_statement: profile.structure.statement,
    structure_mixed: profile.structure.mixed,
  };
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key in a) {
    dotProduct += a[key] * (b[key] || 0);
    normA += a[key] * a[key];
    normB += (b[key] || 0) * (b[key] || 0);
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 답장 유사도 계산 (0-100)
 */
export function calculateReplyScore(
  features: ReplyFeatures,
  mode: PromptMode
): number {
  const profile = getModeProfile(mode);
  const featureScore = featuresToScore(features);
  const profileScore = profileToScore(profile);

  const similarity = cosineSimilarity(featureScore, profileScore);
  return Math.round(similarity * 100);
}

/**
 * 3개 답장 중 추천 배지 표시
 */
export function getRecommendedIndex(
  replies: Array<{ text: string; features?: ReplyFeatures }>,
  mode: PromptMode
): number {
  if (replies.length === 0) return -1;

  let maxScore = -1;
  let recommendedIndex = 0;

  for (let i = 0; i < replies.length; i++) {
    if (!replies[i].features) continue;

    const score = calculateReplyScore(replies[i].features!, mode);
    if (score > maxScore) {
      maxScore = score;
      recommendedIndex = i;
    }
  }

  return maxScore > 50 ? recommendedIndex : -1; // 50 이상일 때만 추천
}

/**
 * 추천 이유 생성
 */
export function getRecommendationReason(
  features: ReplyFeatures,
  mode: PromptMode
): string {
  const profile = getModeProfile(mode);

  // 프로필과 가장 잘 맞는 특징 찾기
  const matches: string[] = [];

  if (
    (features.tone === "polite" && profile.tone.polite > 0.5) ||
    (features.tone === "casual" && profile.tone.casual > 0.5)
  ) {
    matches.push("톤이 맞음");
  }

  if (
    (features.length === "short" && profile.length.short > 0.5) ||
    (features.length === "medium" && profile.length.medium > 0.5) ||
    (features.length === "long" && profile.length.long > 0.5)
  ) {
    matches.push("길이가 적절함");
  }

  if (
    (features.directness === "soft" && profile.directness.soft > 0.5) ||
    (features.directness === "direct" && profile.directness.direct > 0.5)
  ) {
    matches.push("표현이 자연스러움");
  }

  if (matches.length === 0) {
    return "당신의 최근 선호도와 가장 유사합니다";
  }

  return `${matches.join(", ")} - 최근 선호도와 일치합니다`;
}

/**
 * 추천 신뢰도 배지
 */
export function getRecommendationBadge(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { label: "⭐ 강력 추천", color: "bg-yellow-100 text-yellow-800" };
  }
  if (score >= 65) {
    return { label: "✓ 추천", color: "bg-green-100 text-green-800" };
  }
  if (score >= 50) {
    return { label: "○ 괜찮음", color: "bg-blue-100 text-blue-800" };
  }
  return { label: "", color: "" };
}
