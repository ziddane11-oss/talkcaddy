import { describe, expect, it } from "vitest";
import { generateMessageHash, parseOcrText, deduplicateMessages } from "./messageParser";

describe("messageParser", () => {
  describe("generateMessageHash", () => {
    it("동일한 speaker와 content는 동일한 hash를 생성한다", () => {
      const hash1 = generateMessageHash("me", "안녕하세요");
      const hash2 = generateMessageHash("me", "안녕하세요");
      expect(hash1).toBe(hash2);
    });

    it("공백과 줄바꿈이 다르더라도 정규화 후 동일한 hash를 생성한다", () => {
      const hash1 = generateMessageHash("me", "안녕하세요   반갑습니다");
      const hash2 = generateMessageHash("me", "안녕하세요 반갑습니다");
      expect(hash1).toBe(hash2);
    });

    it("speaker가 다르면 다른 hash를 생성한다", () => {
      const hash1 = generateMessageHash("me", "안녕하세요");
      const hash2 = generateMessageHash("other", "안녕하세요");
      expect(hash1).not.toBe(hash2);
    });

    it("content가 다르면 다른 hash를 생성한다", () => {
      const hash1 = generateMessageHash("me", "안녕하세요");
      const hash2 = generateMessageHash("me", "반갑습니다");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("parseOcrText", () => {
    it("빈 텍스트는 빈 배열을 반환한다", () => {
      const result = parseOcrText("");
      expect(result).toEqual([]);
    });

    it("단일 메시지를 파싱한다", () => {
      const result = parseOcrText("안녕하세요");
      expect(result).toHaveLength(1);
      expect(result[0]?.speaker).toBe("unknown");
      expect(result[0]?.content).toBe("안녕하세요");
      expect(result[0]?.hash).toBeDefined();
    });

    it("여러 줄의 메시지를 파싱한다", () => {
      const result = parseOcrText("안녕하세요\n반갑습니다\n좋은 하루 되세요");
      expect(result).toHaveLength(3);
    });

    it("빈 줄은 무시한다", () => {
      const result = parseOcrText("안녕하세요\n\n\n반갑습니다");
      expect(result).toHaveLength(2);
    });
  });

  describe("deduplicateMessages", () => {
    it("중복되지 않은 메시지는 모두 반환한다", () => {
      const existingHashes = new Set<string>();
      const newMessages = [
        { speaker: "me" as const, content: "안녕하세요", hash: "hash1" },
        { speaker: "other" as const, content: "반갑습니다", hash: "hash2" },
      ];

      const result = deduplicateMessages(existingHashes, newMessages);
      expect(result).toHaveLength(2);
    });

    it("중복된 메시지는 제거한다", () => {
      const existingHashes = new Set(["hash1"]);
      const newMessages = [
        { speaker: "me" as const, content: "안녕하세요", hash: "hash1" },
        { speaker: "other" as const, content: "반갑습니다", hash: "hash2" },
      ];

      const result = deduplicateMessages(existingHashes, newMessages);
      expect(result).toHaveLength(1);
      expect(result[0]?.hash).toBe("hash2");
    });

    it("모든 메시지가 중복이면 빈 배열을 반환한다", () => {
      const existingHashes = new Set(["hash1", "hash2"]);
      const newMessages = [
        { speaker: "me" as const, content: "안녕하세요", hash: "hash1" },
        { speaker: "other" as const, content: "반갑습니다", hash: "hash2" },
      ];

      const result = deduplicateMessages(existingHashes, newMessages);
      expect(result).toHaveLength(0);
    });
  });
});
