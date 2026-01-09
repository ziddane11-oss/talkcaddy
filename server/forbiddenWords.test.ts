import { describe, it, expect } from "vitest";
import { analyzeReplyRisk, getRiskColor, getRiskIcon } from "./forbiddenWords";

describe("forbiddenWords", () => {
  describe("analyzeReplyRisk - trade (거래)", () => {
    it("should detect forbidden words in trade context", () => {
      const result = analyzeReplyRisk("환불 불가입니다.", "trade");
      expect(result.hasRisk).toBe(true);
      expect(result.riskLevel).toBe("high");
      expect(result.warnings.some((w) => w.type === "forbidden_word")).toBe(true);
    });

    it("should detect unclear commitment in trade", () => {
      const result = analyzeReplyRisk("해볼게요.", "trade");
      expect(result.hasRisk).toBe(true);
      expect(result.riskLevel).toBe("high");
      expect(result.warnings.some((w) => w.type === "unclear_commitment")).toBe(true);
    });

    it("should warn about long replies in trade", () => {
      const longReply = "이것은 거래 관계에서 너무 긴 답변입니다. ".repeat(5);
      const result = analyzeReplyRisk(longReply, "trade");
      expect(result.hasRisk).toBe(true);
      expect(result.warnings.some((w) => w.type === "too_long")).toBe(true);
    });

    it("should detect ambiguous expressions", () => {
      const result = analyzeReplyRisk("아마도 가능할 것 같습니다.", "trade");
      expect(result.hasRisk).toBe(true);
      expect(result.warnings.some((w) => w.type === "ambiguous")).toBe(true);
    });

    it("should pass safe trade reply", () => {
      const result = analyzeReplyRisk("내일 오후 3시에 확인하고 연락드리겠습니다.", "trade");
      expect(result.hasRisk).toBe(false);
      expect(result.riskLevel).toBe("low");
    });
  });

  describe("analyzeReplyRisk - work (업무)", () => {
    it("should detect forbidden words in work context", () => {
      const result = analyzeReplyRisk("책임 전가하지 마세요.", "work");
      expect(result.hasRisk).toBe(true);
      expect(result.riskLevel).toBe("high");
    });

    it("should warn about aggressive tone", () => {
      const result = analyzeReplyRisk("이건 불가능해!!! 절대 안 돼!!!", "work");
      expect(result.hasRisk).toBe(true);
      expect(result.warnings.some((w) => w.type === "aggressive_tone")).toBe(true);
    });

    it("should pass safe work reply", () => {
      const result = analyzeReplyRisk("확인했습니다. 내일까지 처리하겠습니다.", "work");
      expect(result.hasRisk).toBe(false);
      expect(result.riskLevel).toBe("low");
    });
  });

  describe("analyzeReplyRisk - dating", () => {
    it("should not flag normal dating replies", () => {
      const result = analyzeReplyRisk("ㅎㅎ 좋아! 언제 만날까?", "dating");
      expect(result.hasRisk).toBe(false);
      expect(result.riskLevel).toBe("low");
    });

    it("should still detect aggressive tone in dating", () => {
      const result = analyzeReplyRisk("뭐야!!! 진짜 화났어!!!", "dating");
      expect(result.hasRisk).toBe(true);
      expect(result.warnings.some((w) => w.type === "aggressive_tone")).toBe(true);
    });
  });

  describe("getRiskColor", () => {
    it("should return correct color for each risk level", () => {
      expect(getRiskColor("high")).toContain("red");
      expect(getRiskColor("medium")).toContain("yellow");
      expect(getRiskColor("low")).toContain("green");
    });
  });

  describe("getRiskIcon", () => {
    it("should return correct icon for each risk level", () => {
      expect(getRiskIcon("high")).toBe("🚨");
      expect(getRiskIcon("medium")).toBe("⚠️");
      expect(getRiskIcon("low")).toBe("✓");
    });
  });

  describe("multiple warnings", () => {
    it("should accumulate multiple warnings", () => {
      const result = analyzeReplyRisk(
        "환불 불가!!! 해볼게요. " + "이것은 거래 관계에서 너무 긴 답변입니다. ".repeat(5),
        "trade"
      );
      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.riskLevel).toBe("high");
    });
  });
});
