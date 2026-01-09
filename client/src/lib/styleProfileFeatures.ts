/**
 * styleProfileFeatures.ts - 답장 텍스트에서 스타일 특징 추출
 * 
 * 길이/존댓말/이모지/부드러움/구조를 분석해서 features 객체 생성
 */

export interface ReplyFeatures {
  length: "short" | "medium" | "long";
  tone: "polite" | "casual";
  emoji: "low" | "mid" | "high";
  directness: "soft" | "neutral" | "direct";
  structure: "question" | "statement" | "mixed";
}

/**
 * 길이 분석
 */
function analyzeLength(text: string): "short" | "medium" | "long" {
  const length = text.length;
  if (length <= 40) return "short";
  if (length <= 90) return "medium";
  return "long";
}

/**
 * 존댓말/반말 분석
 */
function analyzeTone(text: string): "polite" | "casual" {
  // 존댓말 패턴
  const politePatterns = [
    /요\b/g,
    /습니다/g,
    /세요/g,
    /드립니다/g,
    /감사합니다/g,
    /드려요/g,
    /해요/g,
    /려고요/g,
  ];

  // 반말 패턴
  const casualPatterns = [
    /ㅋㅋ/g,
    /ㅎㅎ/g,
    /야\b/g,
    /나\b/g,
    /너\b/g,
    /했어/g,
    /해\?/g,
    /어\b/g,
    /지\b/g,
  ];

  const politeCount = politePatterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  const casualCount = casualPatterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  return politeCount >= casualCount ? "polite" : "casual";
}

/**
 * 이모지/ㅋㅋ/ㅎㅎ 개수 분석
 */
function analyzeEmoji(text: string): "low" | "mid" | "high" {
  const emojiPatterns = [
    /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, // 이모지
    /ㅋㅋ/g,
    /ㅎㅎ/g,
    /ㅠㅠ/g,
    /ㅜㅜ/g,
  ];

  const emojiCount = emojiPatterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  if (emojiCount <= 1) return "low";
  if (emojiCount <= 3) return "mid";
  return "high";
}

/**
 * 부드러움/직설성 분석
 */
function analyzeDirectness(text: string): "soft" | "neutral" | "direct" {
  // 부드러운 표현
  const softPatterns = [
    /괜찮/g,
    /혹시/g,
    /가능/g,
    /부탁/g,
    /편하실/g,
    /천천히/g,
    /조심스럽/g,
    /괜찮으시/g,
    /괜찮으면/g,
  ];

  // 직설적 표현
  const directPatterns = [
    /해\b/g,
    /하지마/g,
    /당장/g,
    /빨리/g,
    /무조건/g,
    /왜\?/g,
    /지금/g,
    /즉시/g,
  ];

  const softCount = softPatterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  const directCount = directPatterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);

  if (softCount > directCount) return "soft";
  if (directCount > softCount) return "direct";
  return "neutral";
}

/**
 * 구조 분석 (질문/진술/혼합)
 */
function analyzeStructure(text: string): "question" | "statement" | "mixed" {
  const questionCount = (text.match(/\?/g) || []).length;
  const sentenceCount = (text.match(/[.!?]/g) || []).length;

  if (questionCount === 0) return "statement";
  if (questionCount > 0 && sentenceCount > 1) return "mixed";
  return "question";
}

/**
 * 답장 텍스트에서 features 추출
 */
export function extractReplyFeatures(text: string): ReplyFeatures {
  return {
    length: analyzeLength(text),
    tone: analyzeTone(text),
    emoji: analyzeEmoji(text),
    directness: analyzeDirectness(text),
    structure: analyzeStructure(text),
  };
}

/**
 * Features를 one-hot 벡터로 변환
 */
export function featuresToOneHot(features: ReplyFeatures): Record<string, Record<string, number>> {
  return {
    length: {
      short: features.length === "short" ? 1 : 0,
      medium: features.length === "medium" ? 1 : 0,
      long: features.length === "long" ? 1 : 0,
    },
    tone: {
      polite: features.tone === "polite" ? 1 : 0,
      casual: features.tone === "casual" ? 1 : 0,
    },
    emoji: {
      low: features.emoji === "low" ? 1 : 0,
      mid: features.emoji === "mid" ? 1 : 0,
      high: features.emoji === "high" ? 1 : 0,
    },
    directness: {
      soft: features.directness === "soft" ? 1 : 0,
      neutral: features.directness === "neutral" ? 1 : 0,
      direct: features.directness === "direct" ? 1 : 0,
    },
    structure: {
      question: features.structure === "question" ? 1 : 0,
      statement: features.structure === "statement" ? 1 : 0,
      mixed: features.structure === "mixed" ? 1 : 0,
    },
  };
}

/**
 * Features 설명 (UI용)
 */
export function getFeatureDescription(features: ReplyFeatures): string {
  const parts: string[] = [];

  const lengthLabel = {
    short: "짧은",
    medium: "보통",
    long: "긴",
  };

  const toneLabel = {
    polite: "공손한",
    casual: "편한",
  };

  const emojiLabel = {
    low: "이모지 적음",
    mid: "이모지 중간",
    high: "이모지 많음",
  };

  const directnessLabel = {
    soft: "부드러운",
    neutral: "중립적",
    direct: "직설적",
  };

  const structureLabel = {
    question: "질문형",
    statement: "진술형",
    mixed: "혼합형",
  };

  parts.push(lengthLabel[features.length]);
  parts.push(toneLabel[features.tone]);
  parts.push(emojiLabel[features.emoji]);
  parts.push(directnessLabel[features.directness]);
  parts.push(structureLabel[features.structure]);

  return parts.join(" · ");
}
