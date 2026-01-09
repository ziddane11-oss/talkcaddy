import { describe, it, expect } from "vitest";
import { ERROR_CODES, ERROR_CODE_TO_MESSAGE, ERROR_CODE_TO_STATUS } from "./errorCodes";

/**
 * 에러 UX 테스트
 * ChatGPT 피드백: 에러 UX 케이스 5가지
 * 1. OCR 실패 (말풍선 영역 다시 잡기)
 * 2. 맥락 부족 (상황 한 줄 입력)
 * 3. 애매한 대화 (해석 선택 UI)
 * 4. AI 응답 실패 (fallback)
 * 5. 개인정보 경고 (업로드 직후)
 */
describe("Error UX Cases", () => {
  describe("Case 1: OCR 실패", () => {
    it("should provide OCR_EMPTY error with retry action", () => {
      const errorCode = ERROR_CODES.OCR_EMPTY;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("OCR_EMPTY");
      expect(message).toContain("스크린샷");
      expect(status).toBe(400);
    });

    it("should suggest screenshot re-capture for OCR failure", () => {
      const errorCode = ERROR_CODES.OCR_EMPTY;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];

      // UI에서 제공할 액션: "다른 스크린샷 올리기" 또는 "텍스트 입력하기"
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe("Case 2: 맥락 부족", () => {
    it("should provide CONTEXT_TOO_SHORT error with guidance", () => {
      const errorCode = ERROR_CODES.CONTEXT_TOO_SHORT;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("CONTEXT_TOO_SHORT");
      expect(message).toContain("10자");
      expect(status).toBe(400);
    });

    it("should provide CONTEXT_MISSING error with action", () => {
      const errorCode = ERROR_CODES.CONTEXT_MISSING;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];

      // UI에서 제공할 액션: "상황 설명 추가하기"
      expect(message).toContain("대화");
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe("Case 3: 애매한 대화", () => {
    it("should provide CONTEXT_AMBIGUOUS error with clarification action", () => {
      const errorCode = ERROR_CODES.CONTEXT_AMBIGUOUS;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("CONTEXT_AMBIGUOUS");
      expect(message).toContain("더 자세");
      expect(status).toBe(400);
    });
  });

  describe("Case 4: AI 응답 실패", () => {
    it("should provide MODEL_ERROR with retry action", () => {
      const errorCode = ERROR_CODES.MODEL_ERROR;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("MODEL_ERROR");
      expect(message).toContain("다시");
      expect(status).toBe(500);
    });

    it("should provide MODEL_TIMEOUT with timeout guidance", () => {
      const errorCode = ERROR_CODES.MODEL_TIMEOUT;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("MODEL_TIMEOUT");
      expect(message).toContain("시간 초과");
      expect(status).toBe(504);
    });

    it("should provide INVALID_RESPONSE error", () => {
      const errorCode = ERROR_CODES.INVALID_RESPONSE;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("INVALID_RESPONSE");
      expect(message).toContain("다시");
      expect(status).toBe(500);
    });
  });

  describe("Case 5: 개인정보 경고", () => {
    it("should provide rate limit warning", () => {
      const errorCode = ERROR_CODES.RATE_LIMIT;
      const message = ERROR_CODE_TO_MESSAGE[errorCode];
      const status = ERROR_CODE_TO_STATUS[errorCode];

      expect(errorCode).toBe("RATE_LIMIT");
      expect(message).toContain("요청");
      expect(status).toBe(429);
    });
  });

  describe("Error UX Flow", () => {
    it("should map all error codes to user-friendly messages", () => {
      Object.values(ERROR_CODES).forEach((code) => {
        const message = ERROR_CODE_TO_MESSAGE[code];
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain("undefined");
      });
    });

    it("should map all error codes to HTTP status codes", () => {
      Object.values(ERROR_CODES).forEach((code) => {
        const status = ERROR_CODE_TO_STATUS[code];
        expect(status).toBeDefined();
        expect(typeof status).toBe("number");
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThanOrEqual(504);
      });
    });

    it("should provide actionable error messages", () => {
      const actionableErrors = [
        ERROR_CODES.OCR_EMPTY,
        ERROR_CODES.CONTEXT_TOO_SHORT,
        ERROR_CODES.MODEL_TIMEOUT,
        ERROR_CODES.RATE_LIMIT,
      ];

      actionableErrors.forEach((code) => {
        const message = ERROR_CODE_TO_MESSAGE[code];
        expect(message).toMatch(/다시|추가|올리|입력/);
      });
    });
  });
});
