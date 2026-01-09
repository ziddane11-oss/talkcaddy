import crypto from "crypto";

/**
 * 베타 피드백 시스템 (메모리 기반)
 * 실시간 피드백 대시보드용
 */

export interface BetaFeedbackItem {
  id: string;
  userId: number;
  feedbackType: "feature" | "bug" | "usability";
  title: string;
  description: string;
  rating?: number; // 1-5 (버그는 null)
  deviceInfo?: string;
  reproducible: boolean;
  reproductionSteps?: string;
  screenshotUrl?: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  priorityScore: number;
  severity?: "low" | "medium" | "high" | "critical";
  duplicateOf?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 메모리 저장소
const feedbackStore = new Map<string, BetaFeedbackItem>();
let feedbackUpdateCallbacks: ((feedback: BetaFeedbackItem) => void)[] = [];

/**
 * 피드백 생성
 */
export function createFeedback(
  userId: number,
  input: Omit<BetaFeedbackItem, "id" | "createdAt" | "updatedAt" | "priorityScore">
): BetaFeedbackItem {
  const feedback: BetaFeedbackItem = {
    ...input,
    id: crypto.randomUUID(),
    priorityScore: calculatePriorityScore(input),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  feedbackStore.set(feedback.id, feedback);

  // 실시간 업데이트 알림
  notifyFeedbackUpdate(feedback);

  return feedback;
}

/**
 * 우선순위 점수 계산
 */
function calculatePriorityScore(feedback: Omit<BetaFeedbackItem, "id" | "createdAt" | "updatedAt" | "priorityScore">): number {
  let score = 0;

  // 피드백 유형별 기본 점수
  const typeScores = {
    bug: 50,
    usability: 30,
    feature: 20,
  };
  score += typeScores[feedback.feedbackType];

  // 심각도 가중치
  if (feedback.severity) {
    const severityScores = {
      critical: 50,
      high: 30,
      medium: 15,
      low: 5,
    };
    score += severityScores[feedback.severity];
  }

  // 평점 (낮을수록 높은 우선순위)
  if (feedback.rating && feedback.feedbackType !== "bug") {
    score += (5 - feedback.rating) * 10;
  }

  // 재현 가능 여부
  if (feedback.reproducible) {
    score += 20;
  }

  return score;
}

/**
 * 피드백 조회
 */
export function getFeedback(id: string): BetaFeedbackItem | null {
  return feedbackStore.get(id) || null;
}

/**
 * 모든 피드백 조회 (필터링 가능)
 */
export function getAllFeedback(filters?: {
  type?: "feature" | "bug" | "usability";
  status?: "open" | "in_progress" | "resolved" | "rejected";
  severity?: "low" | "medium" | "high" | "critical";
}): BetaFeedbackItem[] {
  let feedbacks = Array.from(feedbackStore.values());

  if (filters?.type) {
    feedbacks = feedbacks.filter((f) => f.feedbackType === filters.type);
  }
  if (filters?.status) {
    feedbacks = feedbacks.filter((f) => f.status === filters.status);
  }
  if (filters?.severity) {
    feedbacks = feedbacks.filter((f) => f.severity === filters.severity);
  }

  // 우선순위 순으로 정렬
  return feedbacks.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * 피드백 상태 업데이트
 */
export function updateFeedbackStatus(
  id: string,
  status: "open" | "in_progress" | "resolved" | "rejected"
): BetaFeedbackItem | null {
  const feedback = feedbackStore.get(id);
  if (!feedback) return null;

  feedback.status = status;
  feedback.updatedAt = new Date();

  notifyFeedbackUpdate(feedback);
  return feedback;
}

/**
 * 중복 피드백 표시
 */
export function markAsDuplicate(
  id: string,
  duplicateOfId: string
): BetaFeedbackItem | null {
  const feedback = feedbackStore.get(id);
  if (!feedback) return null;

  feedback.duplicateOf = duplicateOfId;
  feedback.status = "rejected";
  feedback.updatedAt = new Date();

  notifyFeedbackUpdate(feedback);
  return feedback;
}

/**
 * 피드백 통계
 */
export function getFeedbackStats() {
  const feedbacks = Array.from(feedbackStore.values());

  return {
    total: feedbacks.length,
    byType: {
      bug: feedbacks.filter((f) => f.feedbackType === "bug").length,
      feature: feedbacks.filter((f) => f.feedbackType === "feature").length,
      usability: feedbacks.filter((f) => f.feedbackType === "usability").length,
    },
    byStatus: {
      open: feedbacks.filter((f) => f.status === "open").length,
      in_progress: feedbacks.filter((f) => f.status === "in_progress").length,
      resolved: feedbacks.filter((f) => f.status === "resolved").length,
      rejected: feedbacks.filter((f) => f.status === "rejected").length,
    },
    bySeverity: {
      critical: feedbacks.filter((f) => f.severity === "critical").length,
      high: feedbacks.filter((f) => f.severity === "high").length,
      medium: feedbacks.filter((f) => f.severity === "medium").length,
      low: feedbacks.filter((f) => f.severity === "low").length,
    },
    averageRating: feedbacks
      .filter((f) => f.rating)
      .reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.filter((f) => f.rating).length || 0,
  };
}

/**
 * 실시간 업데이트 콜백 등록
 */
export function onFeedbackUpdate(
  callback: (feedback: BetaFeedbackItem) => void
): () => void {
  feedbackUpdateCallbacks.push(callback);

  // 구독 해제 함수 반환
  return () => {
    feedbackUpdateCallbacks = feedbackUpdateCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * 피드백 업데이트 알림
 */
function notifyFeedbackUpdate(feedback: BetaFeedbackItem) {
  feedbackUpdateCallbacks.forEach((callback) => {
    try {
      callback(feedback);
    } catch (error) {
      console.error("[Beta] 피드백 업데이트 콜백 에러:", error);
    }
  });
}

/**
 * 중복 피드백 감지
 */
export function detectDuplicates(
  newFeedback: BetaFeedbackItem,
  similarityThreshold: number = 0.7
): BetaFeedbackItem[] {
  const feedbacks = Array.from(feedbackStore.values()).filter(
    (f) => f.feedbackType === newFeedback.feedbackType && f.id !== newFeedback.id
  );

  return feedbacks.filter((f) => {
    // 간단한 유사도 검사 (단어 겹침)
    const newWords = new Set(newFeedback.title.toLowerCase().split(/\s+/));
    const existingWords = new Set(f.title.toLowerCase().split(/\s+/));

    const intersection = new Set(Array.from(newWords).filter((x) => existingWords.has(x)));
    const union = new Set([...Array.from(newWords), ...Array.from(existingWords)]);

    const similarity = intersection.size / union.size;
    return similarity >= similarityThreshold;
  });
}
