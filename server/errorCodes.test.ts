import { describe, it, expect } from "vitest";
import { ApiError, ERROR_CODES, ERROR_CODE_TO_MESSAGE, ERROR_CODE_TO_STATUS } from "./errorCodes";

describe("errorCodes", () => {
  describe("ERROR_CODES", () => {
    it("should have all required error codes", () => {
      expect(ERROR_CODES.OCR_EMPTY).toBe("OCR_EMPTY");
      expect(ERROR_CODES.CONTEXT_TOO_SHORT).toBe("CONTEXT_TOO_SHORT");
      expect(ERROR_CODES.MODEL_TIMEOUT).toBe("MODEL_TIMEOUT");
      expect(ERROR_CODES.UPLOAD_NOT_FOUND).toBe("UPLOAD_NOT_FOUND");
      expect(ERROR_CODES.CONVERSATION_NOT_FOUND).toBe("CONVERSATION_NOT_FOUND");
    });
  });

  describe("ERROR_CODE_TO_STATUS", () => {
    it("should map error codes to HTTP status codes", () => {
      expect(ERROR_CODE_TO_STATUS[ERROR_CODES.OCR_EMPTY]).toBe(400);
      expect(ERROR_CODE_TO_STATUS[ERROR_CODES.CONTEXT_TOO_SHORT]).toBe(400);
      expect(ERROR_CODE_TO_STATUS[ERROR_CODES.MODEL_TIMEOUT]).toBe(504);
      expect(ERROR_CODE_TO_STATUS[ERROR_CODES.UPLOAD_NOT_FOUND]).toBe(404);
      expect(ERROR_CODE_TO_STATUS[ERROR_CODES.RATE_LIMIT]).toBe(429);
    });
  });

  describe("ERROR_CODE_TO_MESSAGE", () => {
    it("should have user-friendly messages for all error codes", () => {
      expect(ERROR_CODE_TO_MESSAGE[ERROR_CODES.OCR_EMPTY]).toContain("스크린샷");
      expect(ERROR_CODE_TO_MESSAGE[ERROR_CODES.CONTEXT_TOO_SHORT]).toContain("10자");
      expect(ERROR_CODE_TO_MESSAGE[ERROR_CODES.MODEL_TIMEOUT]).toContain("시간 초과");
      expect(ERROR_CODE_TO_MESSAGE[ERROR_CODES.UPLOAD_NOT_FOUND]).toContain("업로드");
    });
  });

  describe("ApiError", () => {
    it("should create an error with code and message", () => {
      const error = new ApiError(ERROR_CODES.OCR_EMPTY);
      expect(error.code).toBe(ERROR_CODES.OCR_EMPTY);
      expect(error.message).toBe(ERROR_CODE_TO_MESSAGE[ERROR_CODES.OCR_EMPTY]);
      expect(error.name).toBe("ApiError");
    });

    it("should support custom message", () => {
      const customMsg = "Custom error message";
      const error = new ApiError(ERROR_CODES.OCR_EMPTY, customMsg);
      expect(error.message).toBe(customMsg);
    });

    it("should support details object", () => {
      const details = { uploadId: 123, conversationId: 456 };
      const error = new ApiError(ERROR_CODES.OCR_EMPTY, undefined, details);
      expect(error.details).toEqual(details);
    });

    it("should serialize to JSON correctly", () => {
      const error = new ApiError(ERROR_CODES.OCR_EMPTY, "Test error", { test: true });
      const json = error.toJSON();
      expect(json.code).toBe(ERROR_CODES.OCR_EMPTY);
      expect(json.message).toBe("Test error");
      expect(json.details).toEqual({ test: true });
    });
  });

  describe("Error code coverage", () => {
    it("should have status code for all error codes", () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_CODE_TO_STATUS[code]).toBeDefined();
        expect(typeof ERROR_CODE_TO_STATUS[code]).toBe("number");
      });
    });

    it("should have message for all error codes", () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_CODE_TO_MESSAGE[code]).toBeDefined();
        expect(typeof ERROR_CODE_TO_MESSAGE[code]).toBe("string");
        expect(ERROR_CODE_TO_MESSAGE[code].length).toBeGreaterThan(0);
      });
    });
  });
});
