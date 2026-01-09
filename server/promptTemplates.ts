/**
 * ChatGPT 조언 기반 AI 프롬프트 템플릿
 * 모드별 세분화: dating, work, trade
 * risk 점수 규격화 (0~100): 0~20 안전, 21~40 안전, 41~60 주의, 61~80 위험, 81~100 매우위험
 */

export type PromptMode = "dating" | "work" | "trade";

interface PromptContext {
  mode: PromptMode;
  relationshipType: string;
  goals: string[];
  restrictions: string[];
  memorySummary: string;
  recentMessages: string;
  contextHint?: string;
  userProfile?: string; // 사용자 스타일 프로필
}

/**
 * 대화 문체 감지 (반말/존댓말)
 * 대화 내용에서 반말 사용 여부를 판단
 */
function detectSpeechStyle(messages: string): "casual" | "formal" | "mixed" {
  // 반말 패턴 (ㅋㅋ, ~야, ~해, ~어, ~지, ~냐, ~임, ~ㅇㅇ 등)
  const casualPatterns = [
    /ㅋㅋ/,
    /ㅎㅎ/,
    /[가-힣]+야\b/,
    /[가-힣]+해\b/,
    /[가-힣]+어\b/,
    /[가-힣]+지\b/,
    /[가-힣]+냐\b/,
    /[가-힣]+임\b/,
    /[가-힣]+ㅇㅇ/,
    /뭐해/,
    /뭐야/,
    /왜\?/,
    /어디야/,
    /뭐라고/,
    /알겠어/,
    /그래\b/,
    /응\b/,
    /어\b/,
    /아니\b/,
  ];
  
  // 존댓말 패턴 (~요, ~습니다, ~세요, ~까요 등)
  const formalPatterns = [
    /[가-힣]+요\b/,
    /[가-힣]+습니다/,
    /[가-힣]+세요/,
    /[가-힣]+까요/,
    /[가-힣]+니다/,
  ];
  
  let casualCount = 0;
  let formalCount = 0;
  
  for (const pattern of casualPatterns) {
    if (pattern.test(messages)) casualCount++;
  }
  
  for (const pattern of formalPatterns) {
    if (pattern.test(messages)) formalCount++;
  }
  
  if (casualCount > formalCount * 2) return "casual";
  if (formalCount > casualCount * 2) return "formal";
  return "mixed";
}

/**
 * 한국 특유의 귀여운 말투(애교체) 감지
 * 연인 사이에서 자주 사용하는 말투 패턴을 감지
 */
interface CuteStyleResult {
  detected: boolean;
  patterns: string[];
  intensity: "light" | "medium" | "heavy";
}

function detectCuteSpeechStyle(messages: string): CuteStyleResult {
  const detectedPatterns: string[] = [];
  
  // 1. 받침 변형 (~용/행/함/얌/냠)
  const suffixPatterns = [
    { pattern: /[가-힣]+용[\?!]?/g, name: "~용" },
    { pattern: /[가-힣]+행[\?!]?/g, name: "~행" },
    { pattern: /[가-힣]+함[\?!]?/g, name: "~함" },
    { pattern: /[가-힣]+얌[\?!]?/g, name: "~얌" },
    { pattern: /[가-힣]+냠[\?!]?/g, name: "~냠" },
    { pattern: /[가-힣]+댬[\?!]?/g, name: "~댬" },
    { pattern: /시퐁/g, name: "시퐁" },
  ];
  
  // 2. 혀 짧은 소리 (~쪄/뗘/꼬야)
  const lispPatterns = [
    { pattern: /[가-힣]+쪄[\?!]?/g, name: "~쪄" },
    { pattern: /[가-힣]+뗘[\?!]?/g, name: "~뗘" },
    { pattern: /[가-힣]+꼬야[\?!]?/g, name: "~꼬야" },
    { pattern: /[가-힣]+꼬얌[\?!]?/g, name: "~꼬얌" },
    { pattern: /모했/g, name: "모했(뭐했)" },
    { pattern: /오뗘/g, name: "오뗘(어때)" },
  ];
  
  // 3. 귀여운 종결어미 (~디/큥/뀨)
  const cuteEndingPatterns = [
    { pattern: /[가-힣]+디[\?!]?/g, name: "~디" },
    { pattern: /[가-힣]+큥[\?!]?/g, name: "~큥" },
    { pattern: /[가-힣]+뀨[\?!]?/g, name: "~뀨" },
    { pattern: /디용[\?!]?/g, name: "디용" },
  ];
  
  // 4. 감탄사/의성어
  const exclamationPatterns = [
    { pattern: /힝[구]?/g, name: "힝/힝구" },
    { pattern: /웅웅/g, name: "웅웅" },
    { pattern: /잉[\.\~]*/g, name: "잉" },
    { pattern: /뿌엥/g, name: "뿌엥" },
    { pattern: /앙[\~]*/g, name: "앙" },
    { pattern: /냥[\~]*/g, name: "냥" },
  ];
  
  // 5. 호칭 변형
  const nicknamePatterns = [
    { pattern: /울\s*[가-힣]+이/g, name: "울 OO이" },
    { pattern: /애기/g, name: "애기" },
    { pattern: /공주/g, name: "공주" },
    { pattern: /왕자/g, name: "왕자" },
  ];
  
  const allPatternGroups = [
    suffixPatterns,
    lispPatterns,
    cuteEndingPatterns,
    exclamationPatterns,
    nicknamePatterns,
  ];
  
  let totalMatches = 0;
  
  for (const group of allPatternGroups) {
    for (const { pattern, name } of group) {
      const matches = messages.match(pattern);
      if (matches && matches.length > 0) {
        if (!detectedPatterns.includes(name)) {
          detectedPatterns.push(name);
        }
        totalMatches += matches.length;
      }
    }
  }
  
  // 강도 판단
  let intensity: "light" | "medium" | "heavy" = "light";
  if (totalMatches >= 5 || detectedPatterns.length >= 4) {
    intensity = "heavy";
  } else if (totalMatches >= 2 || detectedPatterns.length >= 2) {
    intensity = "medium";
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    intensity,
  };
}

/**
 * 문체 지시문 생성 (애교체 포함)
 */
function getSpeechStyleInstruction(messages: string, relationshipType: string): string {
  const style = detectSpeechStyle(messages);
  const cuteStyle = detectCuteSpeechStyle(messages);
  
  // 친밀한 관계 (썸, 연애)에서 애교체 사용 시
  if ((relationshipType === "썸" || relationshipType === "연애") && cuteStyle.detected) {
    const intensityGuide = {
      light: "가볍게",
      medium: "적당히",
      heavy: "적극적으로",
    };
    
    return `
❗❗❗ 문체 지시 (필수) ❗❗❗
이 대화는 귀여운 애교체를 사용하는 친밀한 연인 관계입니다.
상대방이 사용하는 말투 패턴: ${cuteStyle.patterns.join(", ")}

답장을 작성할 때 반드시 상대방의 말투를 ${intensityGuide[cuteStyle.intensity]} 흉내내세요.

✅ 사용해야 할 표현 예시:
- 받침 변형: ~용, ~행, ~함, ~얌 (예: "알았어용", "보고시퐁", "먹었냠")
- 혀 짧은 소리: ~쪄, ~뗘, ~꼬야 (예: "모했쪄?", "오뗘?", "갈꼬야!")
- 귀여운 종결어미: ~디, ~큥, ~뀨 (예: "알겠큥!", "미안뀨")
- 감탄사: 힝, 웅, 잉, 뿌엥 (예: "힝.. 보고 싶어", "웅웅 알겠어")

❌ 절대 사용 금지: 딱딱한 존댓말 (~습니다, ~세요)
❌ 너무 과하게 사용하지 말고 자연스럽게 섞어서 사용

예시 답변:
- "보고 싶었어용~ 오늘 만날꼬야? 힝"
- "알겠쪄! 기다릴겡 ㅎㅎ"
- "웅웅 나도 좋아행~"

이 지시를 무시하면 응답이 부자연스럽게 됩니다.`;
  }
  
  // 친밀한 관계 (썸, 연애)에서 반말 사용 시 (애교체 아닌 경우)
  if ((relationshipType === "썸" || relationshipType === "연애") && style === "casual") {
    return `
❗❗❗ 문체 지시 (필수) ❗❗❗
이 대화는 반말을 사용하는 친밀한 관계입니다.
답장을 작성할 때 반드시 반말체를 사용하세요.

❌ 절대 사용 금지: ~요, ~습니다, ~세요, ~까요, ~니다
✅ 사용해야 할 표현: ~어, ~지, ~야, ~네, ~라, ~게, ㅋㅋ, ㅎㅎ

예시:
- "미안해요" → "미안해" 또는 "미안~"
- "괜찮아요" → "괜찮아" 또는 "괜찮아!"
- "보고 싶어요" → "보고 싶어" 또는 "보고 싶었어"
- "만나요" → "만나자" 또는 "보자"

이 지시를 무시하면 응답이 부자연스럽게 됩니다.`;
  }
  
  // 직장/거래 관계는 항상 존댓말
  if (relationshipType === "직장" || relationshipType === "거래") {
    return `
중요: 직장/비즈니스 관계입니다. 답장은 반드시 존댓말로 작성하세요.`;
  }
  
  // 혼합 또는 존댓말 사용 시
  if (style === "formal") {
    return `
중요: 대화에서 존댓말을 사용하고 있습니다. 답장도 존댓말로 작성하세요.`;
  }
  
  // 기본값: 대화 톤에 맞춤
  return `
대화의 문체(반말/존댓말)를 파악하여 동일한 문체로 답장을 작성하세요.`;
}

/**
 * 분석 프롬프트 생성 - 텍스트 형식으로 변경
 */
export function generateAnalysisPrompt(context: PromptContext): string {
  const speechStyleInstruction = getSpeechStyleInstruction(context.recentMessages, context.relationshipType);
  
  return `당신은 카톡 대화 분석 전문가입니다.

다음 대화를 분석하고, 상대방의 심리, 대화 해석, 그리고 3가지 톤의 답장을 제시하세요.

대화방 정보:
- 관계: ${context.relationshipType}
- 목표: ${context.goals.join(", ")}
- 금지: ${context.restrictions.length > 0 ? context.restrictions.join(", ") : "없음"}
${speechStyleInstruction}
${context.userProfile ? `
사용자 선호:
${context.userProfile}` : ""}

메모리: ${context.memorySummary}

분석할 대화:
${context.recentMessages}

다음 형식으로 분석 결과를 작성하세요:

심리 분석: [상대방의 심리를 1-2줄로 설명]

해석: [대화를 어떻게 해석했는지 설명]

더 필요한 맥락: [yes 또는 no]

[yes인 경우만] 질문: [더 알아야 할 것]

부드러운 톤 답장: [60-110자의 답장]
부드러운 톤 효과: [예상 효과]
부드러운 톤 위험도: [0-100 사이의 숫자]

균형잡힌 톤 답장: [60-110자의 답장]
균형잡힌 톤 효과: [예상 효과]
균형잡힌 톤 위험도: [0-100 사이의 숫자]

유머러스한 톤 답장: [60-110자의 답장]
유머러스한 톤 효과: [예상 효과]
유머러스한 톤 위험도: [0-100 사이의 숫자]

업데이트된 메모리: [최신 대화 상황 요약]`;
}

/**
 * 톤 변경 재생성 프롬프트
 */
export function generateRegeneratePrompt(
  context: PromptContext,
  tone: "soft" | "balanced" | "humor"
): string {
  const toneMap = {
    soft: "부드럽고 공감적인",
    balanced: "균형 잡힌",
    humor: "유머러스한"
  };

  const speechStyleInstruction = getSpeechStyleInstruction(context.recentMessages, context.relationshipType);

  return `당신은 카톡 대화 분석 전문가입니다.

다음 대화를 분석하고, ${toneMap[tone]} 톤의 답장을 제시하세요.

대화방 정보:
- 관계: ${context.relationshipType}
- 목표: ${context.goals.join(", ")}
- 금지: ${context.restrictions.length > 0 ? context.restrictions.join(", ") : "없음"}
${speechStyleInstruction}
${context.userProfile ? `
사용자 선호:
${context.userProfile}` : ""}

메모리: ${context.memorySummary}

분석할 대화:
${context.recentMessages}

다음 형식으로 분석 결과를 작성하세요:

심리 분석: [상대방의 심리를 1-2줄로 설명]

${toneMap[tone]} 톤 답장: [60-110자의 답장]
${toneMap[tone]} 톤 효과: [예상 효과]
${toneMap[tone]} 톤 위험도: [0-100 사이의 숫자]`;
}

/**
 * 추가 맥락 포함 재분석 프롬프트
 */
export function generateReanalysisPrompt(
  context: PromptContext,
  additionalContext: string
): string {
  const speechStyleInstruction = getSpeechStyleInstruction(context.recentMessages, context.relationshipType);

  return `당신은 카톡 대화 분석 전문가입니다.

다음 대화를 분석하고, 상대방의 심리, 대화 해석, 그리고 3가지 톤의 답장을 제시하세요.

대화방 정보:
- 관계: ${context.relationshipType}
- 목표: ${context.goals.join(", ")}
- 금지: ${context.restrictions.length > 0 ? context.restrictions.join(", ") : "없음"}
${speechStyleInstruction}
${context.userProfile ? `
사용자 선호:
${context.userProfile}` : ""}

메모리: ${context.memorySummary}

분석할 대화:
${context.recentMessages}

추가 맥락:
${additionalContext}

다음 형식으로 분석 결과를 작성하세요:

심리 분석: [상대방의 심리를 1-2줄로 설명]

해석: [대화를 어떻게 해석했는지 설명]

부드러운 톤 답장: [60-110자의 답장]
부드러운 톤 효과: [예상 효과]
부드러운 톤 위험도: [0-100 사이의 숫자]

균형잡힌 톤 답장: [60-110자의 답장]
균형잡힌 톤 효과: [예상 효과]
균형잡힌 톤 위험도: [0-100 사이의 숫자]

유머러스한 톤 답장: [60-110자의 답장]
유머러스한 톤 효과: [예상 효과]
유머러스한 톤 위험도: [0-100 사이의 숫자]

업데이트된 메모리: [최신 대화 상황 요약]`;
}
