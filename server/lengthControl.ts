/**
 * lengthControl.ts - 답장 길이 조절 유틸
 * 
 * 짧게/보통/길게 3단으로 답장 길이 조절
 * 프롬프트에 길이 지시문 추가
 */

export type LengthPreference = "short" | "medium" | "long";

export interface LengthConfig {
  preference: LengthPreference;
  maxCharacters: number;
  description: string;
  instruction: string;
}

/**
 * 길이별 설정
 */
const LENGTH_CONFIGS: Record<LengthPreference, LengthConfig> = {
  short: {
    preference: "short",
    maxCharacters: 50,
    description: "짧게 (한 문장)",
    instruction:
      "답변은 한 문장으로 50자 이내로 간결하게 작성하세요. 핵심만 전달하세요.",
  },
  medium: {
    preference: "medium",
    maxCharacters: 110,
    description: "보통 (2-3문장)",
    instruction:
      "답변은 2-3문장으로 110자 이내로 작성하세요. 명확하고 자연스럽게 전달하세요.",
  },
  long: {
    preference: "long",
    maxCharacters: 200,
    description: "길게 (4-5문장)",
    instruction:
      "답변은 4-5문장으로 200자 이내로 작성하세요. 충분한 맥락과 설명을 포함하세요.",
  },
};

/**
 * 길이 설정 조회
 */
export function getLengthConfig(preference: LengthPreference): LengthConfig {
  return LENGTH_CONFIGS[preference];
}

/**
 * 프롬프트에 포함할 길이 지시문
 */
export function getLengthInstruction(preference: LengthPreference): string {
  return LENGTH_CONFIGS[preference].instruction;
}

/**
 * 답변 길이 검증
 */
export function validateLength(
  text: string,
  preference: LengthPreference
): {
  isValid: boolean;
  currentLength: number;
  maxLength: number;
  message: string;
} {
  const config = LENGTH_CONFIGS[preference];
  const currentLength = text.length;
  const isValid = currentLength <= config.maxCharacters;

  let message = "";
  if (!isValid) {
    const excess = currentLength - config.maxCharacters;
    message = `${excess}자 초과입니다. ${config.description}에 맞게 조정해주세요.`;
  } else {
    message = `${config.description} 기준을 충족합니다.`;
  }

  return {
    isValid,
    currentLength,
    maxLength: config.maxCharacters,
    message,
  };
}

/**
 * 길이별 문장 수 추정
 */
export function estimateSentenceCount(preference: LengthPreference): string {
  const config = LENGTH_CONFIGS[preference];
  const counts: Record<LengthPreference, string> = {
    short: "1문장",
    medium: "2-3문장",
    long: "4-5문장",
  };
  return counts[preference];
}

/**
 * 길이 슬라이더 UI용 레이블
 */
export function getLengthLabel(preference: LengthPreference): string {
  const labels: Record<LengthPreference, string> = {
    short: "📝 짧게",
    medium: "📄 보통",
    long: "📖 길게",
  };
  return labels[preference];
}

/**
 * 길이 슬라이더 UI용 설명
 */
export function getLengthDescription(preference: LengthPreference): string {
  const descriptions: Record<LengthPreference, string> = {
    short: "한 문장으로 핵심만 전달",
    medium: "자연스럽고 명확한 답변",
    long: "충분한 맥락과 설명 포함",
  };
  return descriptions[preference];
}

/**
 * 길이 슬라이더 UI용 색상
 */
export function getLengthColor(preference: LengthPreference): string {
  const colors: Record<LengthPreference, string> = {
    short: "bg-blue-100 text-blue-700",
    medium: "bg-orange-100 text-orange-700",
    long: "bg-green-100 text-green-700",
  };
  return colors[preference];
}

/**
 * 텍스트 길이 기반 추천 길이
 */
export function recommendLength(textLength: number): LengthPreference {
  if (textLength <= 50) return "short";
  if (textLength <= 110) return "medium";
  return "long";
}
