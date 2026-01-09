/**
 * choiceHistory.ts - 사용자 선택 기록 저장
 * 
 * 50-200개 선택 기록 유지해서 학습 데이터로 사용
 */

import type { PromptMode } from "./styleProfileManager";
import type { ReplyFeatures } from "./styleProfileFeatures";

export interface ChoiceRecord {
  id: string;
  mode: PromptMode;
  chosenIndex: 0 | 1 | 2; // 3개 답장 중 선택 인덱스
  replyText: string;
  features: ReplyFeatures;
  createdAt: number;
}

const STORAGE_KEY = "talkcaddy_choice_history";
const MIN_RECORDS = 50;
const MAX_RECORDS = 200;

/**
 * 선택 기록 조회
 */
export function getChoiceHistory(): ChoiceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load choice history:", error);
    return [];
  }
}

/**
 * 선택 기록 추가
 */
export function addChoiceRecord(
  mode: PromptMode,
  chosenIndex: 0 | 1 | 2,
  replyText: string,
  features: ReplyFeatures
): void {
  try {
    const history = getChoiceHistory();

    const record: ChoiceRecord = {
      id: `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mode,
      chosenIndex,
      replyText,
      features,
      createdAt: Date.now(),
    };

    history.push(record);

    // 최대 개수 초과 시 오래된 것부터 제거
    if (history.length > MAX_RECORDS) {
      const toRemove = history.length - MAX_RECORDS;
      history.splice(0, toRemove);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to add choice record:", error);
  }
}

/**
 * 모드별 선택 기록 조회
 */
export function getChoiceHistoryByMode(mode: PromptMode): ChoiceRecord[] {
  return getChoiceHistory().filter(record => record.mode === mode);
}

/**
 * 최근 N개 선택 기록
 */
export function getRecentChoices(n: number = 10): ChoiceRecord[] {
  const history = getChoiceHistory();
  return history.slice(Math.max(0, history.length - n));
}

/**
 * 선택 기록 통계
 */
export function getChoiceStats(mode: PromptMode) {
  const records = getChoiceHistoryByMode(mode);

  if (records.length === 0) {
    return {
      totalChoices: 0,
      indexDistribution: { 0: 0, 1: 0, 2: 0 },
      featureFrequency: {},
    };
  }

  // 인덱스별 선택 분포
  const indexDistribution = { 0: 0, 1: 0, 2: 0 };
  for (const record of records) {
    indexDistribution[record.chosenIndex]++;
  }

  // 특징별 빈도
  const featureFrequency: Record<string, number> = {};
  for (const record of records) {
    const key = `${record.features.length}_${record.features.tone}_${record.features.emoji}`;
    featureFrequency[key] = (featureFrequency[key] || 0) + 1;
  }

  return {
    totalChoices: records.length,
    indexDistribution,
    featureFrequency,
  };
}

/**
 * 선택 기록 전체 삭제
 */
export function clearChoiceHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear choice history:", error);
  }
}

/**
 * 모드별 선택 기록 삭제
 */
export function clearChoiceHistoryByMode(mode: PromptMode): void {
  try {
    const history = getChoiceHistory();
    const filtered = history.filter(record => record.mode !== mode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to clear choice history by mode:", error);
  }
}
