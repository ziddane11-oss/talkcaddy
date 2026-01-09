/**
 * textParser.ts - AI 응답 JSON 파싱 유틸리티
 * 
 * ChatGPT/Gemini 권장 사항 반영:
 * 1. 스택 기반 balanced JSON 추출 (정규식 \{[\s\S]*\} 대신)
 * 2. jsonrepair로 깨진 JSON 복구
 * 3. 다양한 LLM 응답 형식 지원 (마크다운, 언어태그, 앞뒤 잡담 등)
 */

import { jsonrepair } from "jsonrepair";

export interface ParsedAnalysis {
  one_line_psychology: string;
  assumption: string;
  need_more_context: boolean;
  context_question: string;
  replies: Array<{
    tone: "soft" | "balanced" | "humor";
    text: string;
    why: string;
    risk: string | number;
  }>;
  updated_memory_summary: string;
}

/**
 * 첫 번째 유효한 JSON 후보를 추출 (스택 기반 balanced 추출)
 * - fenced code block 우선 (언어태그 무시)
 * - 그 다음: 첫 '{' 또는 '['부터 balanced로 자르기
 */
function extractFirstJsonCandidate(s: string): string | null {
  if (!s || typeof s !== 'string') return null;

  // 1. fenced code block 우선 (언어태그 무시: json, JSON, js, javascript 등)
  const fence = s.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    const trimmed = fence[1].trim();
    if (trimmed) return trimmed;
  }

  // 2. 그 다음: 첫 '{' 또는 '['부터 balanced로 자르기
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  
  // 둘 다 없으면 null
  if (startObj === -1 && startArr === -1) return null;
  
  // 더 앞에 있는 것 선택
  const start = 
    startObj === -1 ? startArr : 
    startArr === -1 ? startObj : 
    Math.min(startObj, startArr);

  const open = s[start];
  const close = open === "{" ? "}" : "]";
  
  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    
    if (ch === '"') {
      inStr = true;
      continue;
    }
    
    if (ch === open) depth++;
    if (ch === close) depth--;
    
    if (depth === 0) {
      return s.slice(start, i + 1);
    }
  }
  
  // balanced하게 닫히지 않았으면 null
  return null;
}

/**
 * AI 응답에서 JSON을 안전하게 추출 및 파싱
 * 
 * 처리 순서:
 * 1. 바로 JSON.parse 시도 (가장 깔끔한 경우)
 * 2. 마크다운/잡담 제거 후 정규식 추출
 * 3. 스택 기반 balanced JSON 추출
 * 4. jsonrepair로 깨진 JSON 복구
 */
export function safeParseAIResponse(content: string): Record<string, any> | null {
  if (!content || typeof content !== 'string') {
    console.error("[safeParseAIResponse] Empty or invalid content");
    return null;
  }

  // 1. 가장 깔끔한 경우: 바로 파싱 성공
  try {
    return JSON.parse(content);
  } catch {
    // 실패 시 정제 작업 시작
  }

  // 2. 마크다운(```json) 및 잡담 제거 후 정규식 추출 (Gemini 권장)
  const clean = content
    .replace(/```json/gi, "")
    .replace(/```JSON/g, "")
    .replace(/```js/gi, "")
    .replace(/```javascript/gi, "")
    .replace(/```/g, "")
    .trim();

  // 정규식으로 가장 바깥쪽 중괄호 추출 시도
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // 계속 진행
    }
  }

  // 3. 스택 기반 balanced JSON 추출 (ChatGPT 권장)
  const candidate = extractFirstJsonCandidate(content);
  if (candidate) {
    // 3-1. 우선 그대로 parse
    try {
      return JSON.parse(candidate);
    } catch {
      // 계속 진행
    }

    // 3-2. 깨진 JSON이면 jsonrepair 후 parse
    try {
      const repaired = jsonrepair(candidate);
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error("[safeParseAIResponse] jsonrepair failed:", repairError);
    }
  }

  // 4. 마지막 시도: 정제된 문자열에서 스택 기반 추출
  const cleanCandidate = extractFirstJsonCandidate(clean);
  if (cleanCandidate) {
    try {
      return JSON.parse(cleanCandidate);
    } catch {
      // 계속 진행
    }

    try {
      const repaired = jsonrepair(cleanCandidate);
      return JSON.parse(repaired);
    } catch {
      // 최종 실패
    }
  }

  console.error("[safeParseAIResponse] All parsing attempts failed");
  console.error("[safeParseAIResponse] content_head:", content.slice(0, 300));
  console.error("[safeParseAIResponse] content_tail:", content.slice(-300));
  
  return null;
}

/**
 * 텍스트 응답에서 특정 섹션 추출 (마크다운 형식 지원)
 * 예: "**심리 분석:**", "심리 분석:", "## 심리 분석" 등
 */
function extractSection(text: string, sectionName: string): string {
  // 마크다운 형식 제거 (볼드, 헤더 등)
  const cleanText = text
    .replace(/\*\*/g, "")  // **볼드** 제거
    .replace(/^#+\s*/gm, "")  // ## 헤더 제거
    .replace(/^-\s*/gm, "");  // - 리스트 제거
  
  // 여러 패턴 시도
  const patterns = [
    // 패턴 1: "\uc139션명: 내용" (다음 섹션까지)
    new RegExp(`${sectionName}[:\uff1a]\\s*([\\s\\S]*?)(?=\\n(?:심리 분석|해석|더 필요한 맥락|질문|부드러운 톤|균형잡힌 톤|유머러스한 톤|업데이트된 메모리|$))`, "i"),
    // 패턴 2: "\uc139션명: 내용" (다음 줄까지)
    new RegExp(`${sectionName}[:\uff1a]\\s*(.+?)(?=\\n|$)`, "i"),
    // 패턴 3: "\uc139션명\n내용" (줄바꿈 후 내용)
    new RegExp(`${sectionName}\\s*\\n(.+?)(?=\\n\\n|$)`, "i"),
  ];
  
  for (const regex of patterns) {
    const match = cleanText.match(regex);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }
  
  return "";
}

/**
 * 텍스트 응답에서 숫자 추출
 */
function extractNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 50;
}

/**
 * LLM 텍스트 응답을 구조화된 데이터로 파싱
 */
export function parseAnalysisResponse(text: string): ParsedAnalysis {
  // 심리 분석 추출
  const psychology = extractSection(text, "심리 분석");

  // 해석 추출
  const assumption = extractSection(text, "해석");

  // 더 필요한 맥락 여부 추출
  const contextSection = extractSection(text, "더 필요한 맥락");
  const need_more_context = contextSection.toLowerCase().includes("yes") || contextSection.toLowerCase().includes("네");

  // 맥락 질문 추출
  const context_question = need_more_context ? extractSection(text, "질문") : "";

  // 3가지 톤의 답장 추출
  const softSection = extractSection(text, "부드러운 톤 답장");
  const softEffect = extractSection(text, "부드러운 톤 효과");
  const softRisk = extractNumber(extractSection(text, "부드러운 톤 위험도"));

  const balancedSection = extractSection(text, "균형잡힌 톤 답장");
  const balancedEffect = extractSection(text, "균형잡힌 톤 효과");
  const balancedRisk = extractNumber(extractSection(text, "균형잡힌 톤 위험도"));

  const humorSection = extractSection(text, "유머러스한 톤 답장");
  const humorEffect = extractSection(text, "유머러스한 톤 효과");
  const humorRisk = extractNumber(extractSection(text, "유머러스한 톤 위험도"));

  // 업데이트된 메모리 추출
  const updated_memory_summary = extractSection(text, "업데이트된 메모리");

  return {
    one_line_psychology: psychology,
    assumption,
    need_more_context,
    context_question,
    replies: [
      {
        tone: "soft",
        text: softSection,
        why: softEffect,
        risk: softRisk,
      },
      {
        tone: "balanced",
        text: balancedSection,
        why: balancedEffect,
        risk: balancedRisk,
      },
      {
        tone: "humor",
        text: humorSection,
        why: humorEffect,
        risk: humorRisk,
      },
    ],
    updated_memory_summary,
  };
}

/**
 * 톤 변경 응답 파싱
 */
export function parseRegenerateResponse(text: string, tone: "soft" | "balanced" | "humor"): {
  one_line_psychology: string;
  reply: {
    tone: "soft" | "balanced" | "humor";
    text: string;
    why: string;
    risk: number;
  };
} {
  const psychology = extractSection(text, "심리 분석");

  const toneMap = {
    soft: "부드러운 톤",
    balanced: "균형잡힌 톤",
    humor: "유머러스한 톤",
  };

  const toneName = toneMap[tone];
  const replyText = extractSection(text, `${toneName} 답장`);
  const effect = extractSection(text, `${toneName} 효과`);
  const risk = extractNumber(extractSection(text, `${toneName} 위험도`));

  return {
    one_line_psychology: psychology,
    reply: {
      tone,
      text: replyText,
      why: effect,
      risk,
    },
  };
}
