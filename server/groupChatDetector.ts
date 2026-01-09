/**
 * 단톡(그룹 채팅) 감지 유틸리티
 * 3명 이상 참가자가 감지되면 groupMode로 전환
 */

export interface GroupChatDetectionResult {
  isGroupChat: boolean;
  participantCount: number;
  participants: string[];
  confidence: "high" | "medium" | "low";
}

/**
 * 대화 텍스트에서 참가자 수를 감지
 * 카카오톡 형식: "이름: 메시지" 또는 "[이름] 메시지"
 */
export function detectGroupChat(text: string): GroupChatDetectionResult {
  const participants = new Set<string>();
  
  // 패턴 1: "이름: 메시지" (가장 일반적)
  const colonPattern = /^([가-힣a-zA-Z0-9_\s]{1,20}):\s*.+$/gm;
  let match;
  while ((match = colonPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  
  // 패턴 2: "[이름] 메시지" (일부 메신저)
  const bracketPattern = /^\[([가-힣a-zA-Z0-9_\s]{1,20})\]\s*.+$/gm;
  while ((match = bracketPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  
  // 패턴 3: 카카오톡 내보내기 형식 "2024년 1월 1일 오후 1:00, 이름: 메시지"
  const kakaoExportPattern = /\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^,]*,\s*([가-힣a-zA-Z0-9_\s]{1,20}):\s*.+/gm;
  while ((match = kakaoExportPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  
  const participantList = Array.from(participants);
  const count = participantList.length;
  
  // 신뢰도 계산
  let confidence: "high" | "medium" | "low" = "low";
  if (count >= 3) {
    // 메시지 수 대비 참가자 비율로 신뢰도 판단
    const lineCount = text.split("\n").filter(l => l.trim()).length;
    if (lineCount >= count * 2) {
      confidence = "high";
    } else if (lineCount >= count) {
      confidence = "medium";
    }
  }
  
  return {
    isGroupChat: count >= 3,
    participantCount: count,
    participants: participantList,
    confidence,
  };
}

/**
 * 단톡용 프롬프트 수정자
 * 기존 프롬프트에 단톡 모드 지시를 추가
 */
export function getGroupChatPromptModifier(detection: GroupChatDetectionResult): string {
  if (!detection.isGroupChat) return "";
  
  return `
[단톡 모드 활성화]
이 대화는 ${detection.participantCount}명이 참여하는 그룹 채팅입니다.
참가자: ${detection.participants.join(", ")}

단톡 분석 시 주의사항:
1. 특정 1명에게만 보내는 답장이 아닌, 전체 방에 무난한 문장으로 작성
2. 각 참가자의 입장/태도를 간략히 요약
3. 대화 주제와 흐름을 파악하여 맥락에 맞는 답장 제안
4. 답장은 그룹 전체에게 보내는 것처럼 작성

`;
}

/**
 * 단톡 분석 결과 스키마 (기존 스키마 확장)
 */
export interface GroupChatAnalysisExtension {
  isGroupChat: boolean;
  participantSummary?: Array<{
    name: string;
    stance: string; // 이 사람의 입장/태도 한 줄 요약
  }>;
  topicSummary?: string; // 대화 주제 요약
}
