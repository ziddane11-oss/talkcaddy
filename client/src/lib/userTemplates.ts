/**
 * userTemplates.ts - 사용자 템플릿 저장 및 관리
 * 
 * 자주 쓰는 표현을 템플릿으로 저장해서 재사용
 */

export interface UserTemplate {
  id: string;
  text: string;
  category: "greeting" | "closing" | "apology" | "request" | "other";
  createdAt: number;
  usageCount: number;
}

const STORAGE_KEY = "talkcaddy_user_templates";
const MAX_TEMPLATES = 20;

/**
 * 템플릿 조회
 */
export function getTemplates(): UserTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load templates:", error);
    return [];
  }
}

/**
 * 템플릿 추가
 */
export function addTemplate(
  text: string,
  category: UserTemplate["category"]
): UserTemplate {
  try {
    const templates = getTemplates();
    
    // 중복 체크
    if (templates.some(t => t.text === text)) {
      throw new Error("이미 저장된 템플릿입니다.");
    }

    // 최대 개수 체크
    if (templates.length >= MAX_TEMPLATES) {
      throw new Error(`최대 ${MAX_TEMPLATES}개까지만 저장 가능합니다.`);
    }

    const newTemplate: UserTemplate = {
      id: `template_${Date.now()}`,
      text,
      category,
      createdAt: Date.now(),
      usageCount: 0,
    };

    templates.push(newTemplate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return newTemplate;
  } catch (error) {
    console.error("Failed to add template:", error);
    throw error;
  }
}

/**
 * 템플릿 삭제
 */
export function deleteTemplate(id: string): void {
  try {
    const templates = getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete template:", error);
  }
}

/**
 * 템플릿 사용 기록
 */
export function recordTemplateUsage(id: string): void {
  try {
    const templates = getTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
      template.usageCount++;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  } catch (error) {
    console.error("Failed to record template usage:", error);
  }
}

/**
 * 카테고리별 템플릿 조회
 */
export function getTemplatesByCategory(
  category: UserTemplate["category"]
): UserTemplate[] {
  return getTemplates().filter(t => t.category === category);
}

/**
 * 자주 쓰는 템플릿 (상위 5개)
 */
export function getFrequentTemplates(): UserTemplate[] {
  return getTemplates()
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
}

/**
 * 템플릿 전체 삭제
 */
export function clearAllTemplates(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear templates:", error);
  }
}

/**
 * 카테고리 레이블
 */
export function getCategoryLabel(category: UserTemplate["category"]): string {
  const labels: Record<UserTemplate["category"], string> = {
    greeting: "인사",
    closing: "마무리",
    apology: "사과",
    request: "요청",
    other: "기타",
  };
  return labels[category];
}

/**
 * 카테고리 아이콘
 */
export function getCategoryIcon(category: UserTemplate["category"]): string {
  const icons: Record<UserTemplate["category"], string> = {
    greeting: "👋",
    closing: "👋",
    apology: "😔",
    request: "🙏",
    other: "📝",
  };
  return icons[category];
}
