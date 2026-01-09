/**
 * styleProfile.ts - 사용자 스타일 프로필 자동 학습
 * 
 * 사용자가 선택한 톤/길이/표현 방식을 기록하여
 * 다음 분석에서 프로필 기반 프롬프트 생성
 */

export interface StyleProfile {
  tonePreference: {
    soft: number; // 부드럽게 선택 횟수
    balanced: number; // 균형 선택 횟수
    humor: number; // 유머 선택 횟수
  };
  lengthPreference: {
    short: number; // 짧은 답변 선택 횟수
    medium: number; // 보통 길이 선택 횟수
    long: number; // 긴 답변 선택 횟수
  };
  expressionStyle: {
    formal: number; // 존댓말 선택 횟수
    casual: number; // 반말/친근 선택 횟수
    emoji: number; // 이모지 많음 선택 횟수
  };
  totalSelections: number; // 총 선택 횟수
  lastUpdated: number; // 마지막 업데이트 시간
}

const STORAGE_KEY = "talkcaddy_style_profile";
const MIN_SELECTIONS_FOR_LEARNING = 3; // 학습 시작 최소 선택 횟수

/**
 * 기본 프로필 생성
 */
function createDefaultProfile(): StyleProfile {
  return {
    tonePreference: { soft: 0, balanced: 0, humor: 0 },
    lengthPreference: { short: 0, medium: 0, long: 0 },
    expressionStyle: { formal: 0, casual: 0, emoji: 0 },
    totalSelections: 0,
    lastUpdated: Date.now(),
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
 * 사용자 선택 기록 (톤)
 */
export function recordToneSelection(tone: "soft" | "balanced" | "humor"): void {
  try {
    const profile = getStyleProfile();
    profile.tonePreference[tone]++;
    profile.totalSelections++;
    profile.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to record tone selection:", error);
  }
}

/**
 * 사용자 선택 기록 (길이)
 */
export function recordLengthSelection(length: "short" | "medium" | "long"): void {
  try {
    const profile = getStyleProfile();
    profile.lengthPreference[length]++;
    profile.totalSelections++;
    profile.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to record length selection:", error);
  }
}

/**
 * 사용자 선택 기록 (표현 스타일)
 */
export function recordExpressionSelection(
  style: "formal" | "casual" | "emoji"
): void {
  try {
    const profile = getStyleProfile();
    profile.expressionStyle[style]++;
    profile.totalSelections++;
    profile.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to record expression selection:", error);
  }
}

/**
 * 선호 톤 분석 (가장 많이 선택한 톤)
 */
export function getPreferredTone(): "soft" | "balanced" | "humor" | null {
  const profile = getStyleProfile();
  if (profile.totalSelections < MIN_SELECTIONS_FOR_LEARNING) return null;

  const { soft, balanced, humor } = profile.tonePreference;
  const max = Math.max(soft, balanced, humor);

  if (max === 0) return null;
  if (soft === max) return "soft";
  if (balanced === max) return "balanced";
  return "humor";
}

/**
 * 선호 길이 분석
 */
export function getPreferredLength(): "short" | "medium" | "long" | null {
  const profile = getStyleProfile();
  if (profile.totalSelections < MIN_SELECTIONS_FOR_LEARNING) return null;

  const { short, medium, long } = profile.lengthPreference;
  const max = Math.max(short, medium, long);

  if (max === 0) return null;
  if (short === max) return "short";
  if (medium === max) return "medium";
  return "long";
}

/**
 * 선호 표현 스타일 분석
 */
export function getPreferredExpressionStyle(): "formal" | "casual" | "emoji" | null {
  const profile = getStyleProfile();
  if (profile.totalSelections < MIN_SELECTIONS_FOR_LEARNING) return null;

  const { formal, casual, emoji } = profile.expressionStyle;
  const max = Math.max(formal, casual, emoji);

  if (max === 0) return null;
  if (formal === max) return "formal";
  if (casual === max) return "casual";
  return "emoji";
}

/**
 * 프로필 요약 (프롬프트에 포함할 텍스트)
 */
export function getProfileSummary(): string | null {
  const profile = getStyleProfile();
  if (profile.totalSelections < MIN_SELECTIONS_FOR_LEARNING) return null;

  const tone = getPreferredTone();
  const length = getPreferredLength();
  const style = getPreferredExpressionStyle();

  const parts: string[] = [];

  if (tone) {
    const toneDesc = {
      soft: "부드럽고 따뜻한 톤",
      balanced: "균형잡힌 톤",
      humor: "유머있는 톤",
    };
    parts.push(`톤: ${toneDesc[tone]}`);
  }

  if (length) {
    const lengthDesc = {
      short: "짧고 간결한 답변",
      medium: "적당한 길이의 답변",
      long: "자세한 답변",
    };
    parts.push(`길이: ${lengthDesc[length]}`);
  }

  if (style) {
    const styleDesc = {
      formal: "존댓말 사용",
      casual: "친근한 표현",
      emoji: "이모지 활용",
    };
    parts.push(`표현: ${styleDesc[style]}`);
  }

  return parts.length > 0 ? `사용자 선호: ${parts.join(", ")}` : null;
}

/**
 * 프로필 초기화
 */
export function resetStyleProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to reset style profile:", error);
  }
}

/**
 * 프로필 통계 (디버깅용)
 */
export function getProfileStats(): string {
  const profile = getStyleProfile();
  return `
총 선택: ${profile.totalSelections}
톤: 부드럽게=${profile.tonePreference.soft}, 균형=${profile.tonePreference.balanced}, 유머=${profile.tonePreference.humor}
길이: 짧음=${profile.lengthPreference.short}, 보통=${profile.lengthPreference.medium}, 김=${profile.lengthPreference.long}
표현: 존댓말=${profile.expressionStyle.formal}, 친근=${profile.expressionStyle.casual}, 이모지=${profile.expressionStyle.emoji}
  `.trim();
}
