import { describe, it, expect } from "vitest";
import { validateAnalysisResult, AnalysisResultSchema } from "./aiValidation";

/**
 * AI 응답 검증 테스트
 * - Zod 스키마 검증
 * - 필수 필드 체크
 * - risk 점수 검증 (0~100)
 */
describe("AI Validation", () => {
  it("should validate correct analysis result with risk scores", () => {
    const validResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있지만 조심스러워하고 있습니다",
      assumption: "상대가 바쁜 상태라고 가정",
      need_more_context: false,
      context_question: "",
      replies: [
        {
          tone: "soft",
          text: "나도 반가워! 요즘 어떻게 지내?",
          why: "부드럽게 대화를 이어갑니다",
          risk: "20 - 너무 적극적이면 부담스러울 수 있습니다",
        },
        {
          tone: "balanced",
          text: "반가워! 잘 지냈어?",
          why: "균형잡힌 톤으로 응답합니다",
          risk: "30 - 무난하지만 특별함이 부족할 수 있습니다",
        },
        {
          tone: "humor",
          text: "오 살아있었구나! ㅋㅋ",
          why: "유머러스하게 분위기를 풉니다",
          risk: "40 - 상대방이 진지한 상황이면 어색할 수 있습니다",
        },
      ],
      updated_memory_summary: "상대방이 먼저 연락을 해왔고, 반가운 분위기입니다",
    });

    const result = validateAnalysisResult(validResponse);
    expect(result.one_line_psychology).toBeDefined();
    expect(result.assumption).toBe("상대가 바쁜 상태라고 가정");
    expect(result.replies).toHaveLength(3);
    expect(result.replies[0].tone).toBe("soft");
    expect(result.replies[1].tone).toBe("balanced");
    expect(result.replies[2].tone).toBe("humor");
    // risk 점수 검증
    expect(result.replies[0].risk).toMatch(/^\d+/);
    expect(result.replies[1].risk).toMatch(/^\d+/);
    expect(result.replies[2].risk).toMatch(/^\d+/);
  });

  it("should reject response with missing required fields", () => {
    const invalidResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있습니다",
      // need_more_context 누락
      replies: [],
    });

    expect(() => validateAnalysisResult(invalidResponse)).toThrow();
  });

  it("should reject response with wrong number of replies", () => {
    const invalidResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있습니다",
      need_more_context: false,
      context_question: "",
      replies: [
        {
          tone: "soft",
          text: "안녕",
          why: "부드럽게",
          risk: "50 - 없음",
        },
        // 2개만 있음 (3개 필요)
      ],
      updated_memory_summary: "요약",
    });

    expect(() => validateAnalysisResult(invalidResponse)).toThrow();
  });

  it("should reject response with invalid tone", () => {
    const invalidResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있습니다",
      need_more_context: false,
      context_question: "",
      replies: [
        {
          tone: "invalid_tone",
          text: "안녕",
          why: "부드럽게",
          risk: "50 - 없음",
        },
        {
          tone: "soft",
          text: "안녕",
          why: "부드럽게",
          risk: "50 - 없음",
        },
        {
          tone: "balanced",
          text: "안녕",
          why: "균형",
          risk: "50 - 없음",
        },
      ],
      updated_memory_summary: "요약",
    });

    expect(() => validateAnalysisResult(invalidResponse)).toThrow();
  });

  it("should reject response with empty text", () => {
    const invalidResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있습니다",
      need_more_context: false,
      context_question: "",
      replies: [
        {
          tone: "soft",
          text: "",
          why: "부드럽게",
          risk: "50 - 없음",
        },
        {
          tone: "balanced",
          text: "안녕",
          why: "균형",
          risk: 50,
        },
        {
          tone: "humor",
          text: "안녕",
          why: "유머",
          risk: 50,
        },
      ],
      updated_memory_summary: "요약",
    });

    expect(() => validateAnalysisResult(invalidResponse)).toThrow();
  });

  it("should reject response with invalid risk score", () => {
    const invalidResponse = JSON.stringify({
      one_line_psychology: "상대방은 관심이 있습니다",
      need_more_context: false,
      context_question: "",
      replies: [
        {
          tone: "soft",
          text: "안녕",
          why: "부드럽게",
          risk: "invalid_risk",
        },
        {
          tone: "balanced",
          text: "안녕",
          why: "균형",
          risk: 50,
        },
        {
          tone: "humor",
          text: "안녕",
          why: "유머",
          risk: 50,
        },
      ],
      updated_memory_summary: "요약",
    });

    expect(() => validateAnalysisResult(invalidResponse)).toThrow();
  });

  it("should validate need_more_context scenario", () => {
    const validResponse = JSON.stringify({
      one_line_psychology: "맥락이 부족하여 정확한 분석이 어렵습니다",
      assumption: "상대가 바쁜 상태",
      need_more_context: true,
      context_question: "이전에 어떤 대화를 나눴나요?",
      replies: [
        {
          tone: "soft",
          text: "잘 지내?",
          why: "일단 안부를 묻습니다",
          risk: "50 - 맥락 없이 답하면 어색할 수 있습니다",
        },
        {
          tone: "balanced",
          text: "응, 잘 지내",
          why: "간단히 응답합니다",
          risk: "55 - 대화가 끊길 수 있습니다",
        },
        {
          tone: "humor",
          text: "나도 궁금해 ㅋㅋ",
          why: "유머로 넘깁니다",
          risk: "60 - 진지한 상황이면 부적절합니다",
        },
      ],
      updated_memory_summary: "맥락 부족으로 추가 정보 필요",
    });

    const result = validateAnalysisResult(validResponse);
    expect(result.need_more_context).toBe(true);
    expect(result.context_question).toContain("이전");
    expect(result.assumption).toBe("상대가 바쁜 상태");
  });
});
