/**
 * styleProfileManager.ts - 모드별 스타일 프로필 관리
 * 
 * EMA 알고리즘으로 사용자 선택 기록에서 자동 학습
 */

export type PromptMode = "dating" | "work" | "trade";

export interface StyleDistribution {
  short: number;
  medium: number;
  long: number;
}

export interface ToneDistribution {
  polite: number;
  casual: number;
}

export interface EmojiDistribution {
  low: number;
  mid: number;
  high: number;
}

export interface DirectnessDistribution {
  soft: number;
  neutral: number;
  direct: number;
}

export interface StructureDistribution {
  question: number;
  statement: number;
  mixed: number;
}

export interface ModeProfile {
  length: StyleDistribution;
  tone: ToneDistribution;
  emoji: EmojiDistribution;
  directness: DirectnessDistribution;
  structure: StructureDistribution;
  updatedAt: number;
}

export interface StyleProfile {
  dating: ModeProfile;
  work: ModeProfile;
  trade: ModeProfile;
}

const STORAGE_KEY = "talkcaddy_style_profile";
const ALPHA = 0.08; // EMA 학습률

/**
 * 기본 프로필 (초기값)
 */
function createDefaultModeProfile(): ModeProfile {
  return {
    length: { short: 0.5, medium: 0.35, long: 0.15 },
    tone: { polite: 0.55, casual: 0.45 },
    emoji: { low: 0.6, mid: 0.3, high: 0.1 },
    directness: { soft: 0.6, neutral: 0.3, direct: 0.1 },
    structure: { question: 0.55, statement: 0.35, mixed: 0.1 },
    updatedAt: Date.now(),
  };
}

function createDefaultProfile(): StyleProfile {
  return {
    dating: createDefaultModeProfile(),
    work: createDefaultModeProfile(),
    trade: createDefaultModeProfile(),
  };
}

/**
 * 프로필 조회
 */
export function getStyleProfile(): StyleProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : createDefaultProfile();
  } catch (error) {
    console.error("Failed to load style profile:", error);
    return createDefaultProfile();
  }
}

/**
 * 프로필 저장
 */
function saveStyleProfile(profile: StyleProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save style profile:", error);
  }
}

/**
 * EMA 업데이트 함수
 */
function emaUpdate(
  distribution: Record<string, number>,
  selectedKey: string,
  alpha: number = ALPHA
): Record<string, number> {
  const updated = { ...distribution };

  // 모든 값에 (1-alpha) 곱하기
  for (const key in updated) {
    updated[key] *= 1 - alpha;
  }

  // 선택된 키에 alpha 더하기
  updated[selectedKey] += alpha;

  // 정규화 (합 = 1)
  const sum = Object.values(updated).reduce((a, b) => a + b, 0);
  for (const key in updated) {
    updated[key] /= sum;
  }

  return updated;
}

/**
 * 모드 프로필 업데이트
 */
function updateModeProfile(
  profile: ModeProfile,
  features: {
    length: "short" | "medium" | "long";
    tone: "polite" | "casual";
    emoji: "low" | "mid" | "high";
    directness: "soft" | "neutral" | "direct";
    structure: "question" | "statement" | "mixed";
  }
): ModeProfile {
  return {
    length: emaUpdate(profile.length as unknown as Record<string, number>, features.length) as unknown as StyleDistribution,
    tone: emaUpdate(profile.tone as unknown as Record<string, number>, features.tone) as unknown as ToneDistribution,
    emoji: emaUpdate(profile.emoji as unknown as Record<string, number>, features.emoji) as unknown as EmojiDistribution,
    directness: emaUpdate(profile.directness as unknown as Record<string, number>, features.directness) as unknown as DirectnessDistribution,
    structure: emaUpdate(profile.structure as unknown as Record<string, number>, features.structure) as unknown as StructureDistribution,
    updatedAt: Date.now(),
  };
}

/**
 * 선택 기록에서 프로필 업데이트
 */
export function recordStyleChoice(
  mode: PromptMode,
  features: {
    length: "short" | "medium" | "long";
    tone: "polite" | "casual";
    emoji: "low" | "mid" | "high";
    directness: "soft" | "neutral" | "direct";
    structure: "question" | "statement" | "mixed";
  }
): void {
  try {
    const profile = getStyleProfile();
    profile[mode] = updateModeProfile(profile[mode], features);
    saveStyleProfile(profile);
  } catch (error) {
    console.error("Failed to record style choice:", error);
  }
}

/**
 * 모드별 프로필 조회
 */
export function getModeProfile(mode: PromptMode): ModeProfile {
  return getStyleProfile()[mode];
}

/**
 * 프로필 리셋
 */
export function resetStyleProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to reset style profile:", error);
  }
}

/**
 * 프로필 요약 (프롬프트용)
 */
export function getProfileSummary(mode: PromptMode): string {
  const profile = getModeProfile(mode);

  // 가장 높은 확률의 특징들 선택
  const topLength = Object.entries(profile.length).sort(([, a], [, b]) => b - a)[0][0];
  const topTone = Object.entries(profile.tone).sort(([, a], [, b]) => b - a)[0][0];
  const topEmoji = Object.entries(profile.emoji).sort(([, a], [, b]) => b - a)[0][0];
  const topDirectness = Object.entries(profile.directness).sort(([, a], [, b]) => b - a)[0][0];
  const topStructure = Object.entries(profile.structure).sort(([, a], [, b]) => b - a)[0][0];

  const toneLabel = topTone === "polite" ? "공손한" : "편한";
  const lengthLabel = topLength === "short" ? "짧은" : topLength === "medium" ? "보통" : "긴";
  const emojiLabel = topEmoji === "low" ? "이모지 적게" : topEmoji === "mid" ? "이모지 중간" : "이모지 많이";
  const directnessLabel = topDirectness === "soft" ? "부드럽게" : topDirectness === "neutral" ? "중립적으로" : "직설적으로";
  const structureLabel = topStructure === "question" ? "질문 형태" : topStructure === "statement" ? "진술 형태" : "혼합 형태";

  return `사용자 선호: ${toneLabel} 톤, ${lengthLabel} 길이, ${emojiLabel}, ${directnessLabel}, ${structureLabel}`;
}

/**
 * 프로필 신뢰도 (0-100)
 */
export function getProfileConfidence(mode: PromptMode): number {
  const profile = getModeProfile(mode);
  
  // 최고 확률이 높을수록 신뢰도 높음
  const maxProbs = [
    Math.max(...Object.values(profile.length)),
    Math.max(...Object.values(profile.tone)),
    Math.max(...Object.values(profile.emoji)),
    Math.max(...Object.values(profile.directness)),
    Math.max(...Object.values(profile.structure)),
  ];

  const avgMax = maxProbs.reduce((a, b) => a + b, 0) / maxProbs.length;
  return Math.round((avgMax - 0.33) / (1 - 0.33) * 100); // 정규화
}
