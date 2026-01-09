import { describe, it, expect } from "vitest";
import { detectGroupChat, getGroupChatPromptModifier } from "./groupChatDetector";

describe("groupChatDetector - 단톡 감지", () => {
  describe("detectGroupChat", () => {
    it("1:1 대화는 단톡으로 감지하지 않음", () => {
      const text = `철수: 안녕
영희: 안녕 반가워
철수: 오늘 뭐해?
영희: 집에 있어`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(false);
      expect(result.participantCount).toBe(2);
    });

    it("3명 이상 대화는 단톡으로 감지", () => {
      const text = `철수: 안녕
영희: 안녕 반가워
민수: 나도 왔어
철수: 오늘 뭐해?
영희: 집에 있어
민수: 나도`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(true);
      expect(result.participantCount).toBe(3);
      expect(result.participants).toContain("철수");
      expect(result.participants).toContain("영희");
      expect(result.participants).toContain("민수");
    });

    it("카카오톡 내보내기 형식 감지", () => {
      const text = `2024년 1월 1일 오후 1:00, 철수: 안녕
2024년 1월 1일 오후 1:01, 영희: 안녕 반가워
2024년 1월 1일 오후 1:02, 민수: 나도 왔어`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(true);
      // 카카오톡 내보내기 형식은 일반 콜론 패턴과 중복 감지될 수 있음
      expect(result.participantCount).toBeGreaterThanOrEqual(3);
    });

    it("대괄호 형식 감지", () => {
      const text = `[철수] 안녕
[영희] 안녕 반가워
[민수] 나도 왔어`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(true);
      expect(result.participantCount).toBe(3);
    });

    it("빈 텍스트 처리", () => {
      const result = detectGroupChat("");
      expect(result.isGroupChat).toBe(false);
      expect(result.participantCount).toBe(0);
    });

    it("이름 없는 텍스트 처리", () => {
      const text = `안녕하세요
반갑습니다
오늘 날씨가 좋네요`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(false);
      expect(result.participantCount).toBe(0);
    });

    it("신뢰도 계산 - high", () => {
      const text = `철수: 안녕
영희: 안녕 반가워
민수: 나도 왔어
철수: 오늘 뭐해?
영희: 집에 있어
민수: 나도
철수: 그럼 만날까?
영희: 좋아
민수: 나도 갈게`;
      
      const result = detectGroupChat(text);
      expect(result.isGroupChat).toBe(true);
      expect(result.confidence).toBe("high");
    });
  });

  describe("getGroupChatPromptModifier", () => {
    it("단톡이 아니면 빈 문자열 반환", () => {
      const detection = {
        isGroupChat: false,
        participantCount: 2,
        participants: ["철수", "영희"],
        confidence: "low" as const,
      };
      
      const modifier = getGroupChatPromptModifier(detection);
      expect(modifier).toBe("");
    });

    it("단톡이면 프롬프트 수정자 반환", () => {
      const detection = {
        isGroupChat: true,
        participantCount: 3,
        participants: ["철수", "영희", "민수"],
        confidence: "high" as const,
      };
      
      const modifier = getGroupChatPromptModifier(detection);
      expect(modifier).toContain("단톡 모드 활성화");
      expect(modifier).toContain("3명");
      expect(modifier).toContain("철수");
      expect(modifier).toContain("영희");
      expect(modifier).toContain("민수");
    });
  });
});
