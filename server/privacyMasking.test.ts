import { describe, it, expect } from "vitest";
import { maskSensitiveInfo, maskMessages } from "./privacyMasking";

/**
 * 개인정보 마스킹 테스트
 * - 전화번호, 계좌번호, 주소, 이메일, 주민등록번호 마스킹
 */
describe("Privacy Masking", () => {
  it("should mask phone numbers with hyphens", () => {
    const text = "내 번호는 010-1234-5678이야";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("전화번호");
    expect(result.maskedText).not.toContain("1234");
    expect(result.maskedText).toContain("010");
  });

  it("should mask phone numbers without hyphens", () => {
    const text = "연락처: 01012345678";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("전화번호");
    expect(result.maskedText).not.toContain("12345678");
  });

  it("should mask bank account numbers", () => {
    const text = "계좌번호는 123-456-789012입니다";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("계좌번호");
    expect(result.maskedText).toContain("****");
  });

  it("should mask addresses", () => {
    const text = "서울특별시 강남구 테헤란로 123에서 만나자";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("주소");
    expect(result.maskedText).toContain("[주소 마스킹]");
  });

  it("should mask email addresses", () => {
    const text = "이메일은 example@domain.com이야";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("이메일");
    expect(result.maskedText).toContain("ex****@domain.com");
  });

  it("should mask resident registration numbers", () => {
    const text = "주민번호: 123456-1234567";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("주민등록번호");
    expect(result.maskedText).toContain("123456-*******");
  });

  it("should not mask normal text", () => {
    const text = "안녕하세요! 오늘 날씨가 좋네요.";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(false);
    expect(result.detectedTypes).toHaveLength(0);
    expect(result.maskedText).toBe(text);
  });

  it("should mask multiple sensitive info types", () => {
    const text = "내 번호는 010-1234-5678이고 이메일은 test@example.com이야";
    const result = maskSensitiveInfo(text);
    
    expect(result.hasSensitiveInfo).toBe(true);
    expect(result.detectedTypes).toContain("전화번호");
    expect(result.detectedTypes).toContain("이메일");
    expect(result.maskedText).not.toContain("1234-5678");
    expect(result.maskedText).not.toContain("test@");
  });

  it("should mask messages array", () => {
    const messages = [
      { speaker: "me", content: "내 번호는 010-1234-5678이야" },
      { speaker: "other", content: "알았어, 나중에 연락할게" },
    ];

    const masked = maskMessages(messages);
    
    expect(masked[0].masked).toBe(true);
    expect(masked[0].content).not.toContain("1234-5678");
    expect(masked[1].masked).toBe(false);
    expect(masked[1].content).toBe("알았어, 나중에 연락할게");
  });

  it("should handle edge cases", () => {
    // 전화번호처럼 보이지만 아닌 경우
    const text1 = "가격은 1,234,567원입니다";
    const result1 = maskSensitiveInfo(text1);
    expect(result1.hasSensitiveInfo).toBe(false);

    // 빈 문자열
    const text2 = "";
    const result2 = maskSensitiveInfo(text2);
    expect(result2.hasSensitiveInfo).toBe(false);
    expect(result2.maskedText).toBe("");
  });
});
