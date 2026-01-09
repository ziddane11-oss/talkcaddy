/**
 * localHistory.ts - 로컬 히스토리 저장 및 관리
 * 
 * 최근 분석 결과 3개를 localStorage에 저장
 * 프라이버시 보호: 원문 저장 X, 요약/메타데이터만 저장
 */

export interface HistoryItem {
  id: string; // UUID
  conversationId: number;
  conversationName: string;
  relationshipType: "썸" | "연애" | "재회" | "직장" | "거래" | "기타";
  timestamp: number; // milliseconds
  summary: string; // 1줄 요약
  selectedTone?: "soft" | "balanced" | "humor"; // 사용자가 선택한 톤
  metrics: {
    affection: number;
    anger: number;
    engagement: number;
    distance: number;
    misunderstanding: number;
  };
}

const STORAGE_KEY = "talkcaddy_history";
const MAX_HISTORY = 3;

/**
 * 히스토리에 새 항목 추가
 */
export function addToHistory(item: Omit<HistoryItem, "id" | "timestamp">): void {
  try {
    const history = getHistory();
    
    // 새 항목 생성
    const newItem: HistoryItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
    };

    // 최근 항목을 앞에 추가하고 3개만 유지
    const updated = [newItem, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

/**
 * 히스토리 조회
 */
export function getHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

/**
 * 특정 히스토리 항목 조회
 */
export function getHistoryItem(id: string): HistoryItem | null {
  const history = getHistory();
  return history.find((item) => item.id === id) || null;
}

/**
 * 히스토리 항목 삭제
 */
export function removeFromHistory(id: string): void {
  try {
    const history = getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete history:", error);
  }
}

/**
 * 전체 히스토리 삭제
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

/**
 * 히스토리 항목 업데이트 (선택한 톤 등)
 */
export function updateHistoryItem(id: string, updates: Partial<HistoryItem>): void {
  try {
    const history = getHistory();
    const updated = history.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to update history:", error);
  }
}

/**
 * 포맷팅된 시간 문자열 반환
 */
export function formatHistoryTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * UUID 생성 (간단한 버전)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
