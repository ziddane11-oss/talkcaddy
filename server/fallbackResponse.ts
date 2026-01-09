/**
 * LLM JSON 파싱 실패 시 Fallback 응답 생성
 */

export interface AnalysisResult {
  one_line_psychology: string;
  assumption: string;
  need_more_context: boolean;
  context_question: string;
  replies: Array<{
    tone: "soft" | "balanced" | "humor";
    text: string;
    why: string;
    risk: number;
  }>;
  updated_memory_summary: string;
}

/**
 * 텍스트에서 첫 문장 추출
 */
function extractFirstSentence(text: string): string {
  const sentences = text.split(/[.!?。！？]/);
  return sentences[0]?.trim() || text.slice(0, 100);
}

/**
 * 텍스트 요약 생성
 */
function summarizeText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * 모드별 템플릿 답장 생성
 */
function generateTemplateReplies(
  mode: "dating" | "work" | "trade"
): Array<{
  tone: "soft" | "balanced" | "humor";
  text: string;
  why: string;
  risk: number;
}> {
  const templates = {
    dating: {
      soft: {
        text: "그래, 나도 바빴어. 너는 요즘 어때?",
        why: "공감과 함께 대화 지속",
        risk: 15,
      },
      balanced: {
        text: "그렇구나. 언제 시간 되면 만나자.",
        why: "실질적인 제안으로 관계 진전",
        risk: 35,
      },
      humor: {
        text: "바쁜 건 핑계고, 사실 날 잊었지? 😄",
        why: "가벼운 유머로 분위기 개선",
        risk: 45,
      },
    },
    work: {
      soft: {
        text: "이해합니다. 편한 시간에 연락 드리겠습니다.",
        why: "전문성과 배려 표현",
        risk: 10,
      },
      balanced: {
        text: "알겠습니다. 다음 주 회의에서 논의하겠습니다.",
        why: "명확한 일정 제시",
        risk: 25,
      },
      humor: {
        text: "바쁘신 거 알아요. 저도 바빠요! 😅",
        why: "공감과 가벼운 톤으로 관계 완화",
        risk: 40,
      },
    },
    trade: {
      soft: {
        text: "그렇군요. 편하실 때 연락 주세요.",
        why: "상대방 배려",
        risk: 20,
      },
      balanced: {
        text: "알겠습니다. 내일 오후에 다시 연락드리겠습니다.",
        why: "명확한 후속 조치",
        risk: 30,
      },
      humor: {
        text: "바쁘신 거 알아요. 저도 바쁜데 시간 냈어요! 😄",
        why: "유머로 친근감 형성",
        risk: 50,
      },
    },
  };

  return [
    {
      tone: "soft",
      text: templates[mode].soft.text,
      why: templates[mode].soft.why,
      risk: templates[mode].soft.risk,
    },
    {
      tone: "balanced",
      text: templates[mode].balanced.text,
      why: templates[mode].balanced.why,
      risk: templates[mode].balanced.risk,
    },
    {
      tone: "humor",
      text: templates[mode].humor.text,
      why: templates[mode].humor.why,
      risk: templates[mode].humor.risk,
    },
  ];
}

/**
 * Fallback 응답 생성
 */
export function generateFallbackResponse(
  llmText: string,
  mode: "dating" | "work" | "trade" = "dating",
  currentMemory: string = ""
): AnalysisResult {
  const firstSentence = extractFirstSentence(llmText);
  const summary = summarizeText(llmText, 150);

  return {
    one_line_psychology: firstSentence || "대화 상대방의 심리 상태를 파악 중입니다.",
    assumption: summary || "제공된 대화 내용을 분석하고 있습니다.",
    need_more_context: false,
    context_question: "",
    replies: generateTemplateReplies(mode),
    updated_memory_summary: currentMemory || "새로운 대화가 시작되었습니다.",
  };
}
