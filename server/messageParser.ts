import crypto from "crypto";

/**
 * 메시지 중복 제거를 위한 해시 생성
 */
export function generateMessageHash(speaker: "me" | "other" | "unknown", content: string): string {
  // 내용 정규화: 공백/줄바꿈 정리, 대소문자 통일
  const normalized = content
    .trim()
    .replace(/\s+/g, " ") // 연속된 공백을 하나로
    .toLowerCase();

  // speaker + normalized content로 해시 생성
  const hashInput = `${speaker}:${normalized}`;
  return crypto.createHash("sha256").update(hashInput, "utf8").digest("hex");
}

/**
 * OCR 텍스트를 파싱하여 speaker 구분
 * (간단한 휴리스틱: 말풍선 위치, 색상 등은 OCR에서 제공하지 않으므로 텍스트 패턴으로 추정)
 */
export interface ParsedMessage {
  speaker: "me" | "other" | "unknown";
  content: string;
  hash: string;
}

export function parseOcrText(ocrText: string): ParsedMessage[] {
  // 줄 단위로 분리
  const lines = ocrText.split("\n").filter(line => line.trim().length > 0);

  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 간단한 휴리스틱: "나:", "상대:" 같은 prefix가 있으면 구분
    // 실제로는 OCR에서 말풍선 위치 정보를 받아야 정확함
    let speaker: "me" | "other" | "unknown" = "unknown";
    let content = trimmed;

    if (trimmed.startsWith("나:") || trimmed.startsWith("Me:")) {
      speaker = "me";
      content = trimmed.replace(/^(나:|Me:)\s*/, "");
    } else if (trimmed.startsWith("상대:") || trimmed.startsWith("Other:")) {
      speaker = "other";
      content = trimmed.replace(/^(상대:|Other:)\s*/, "");
    }

    const hash = generateMessageHash(speaker, content);
    messages.push({ speaker, content, hash });
  }

  return messages;
}

/**
 * 메시지 리스트에서 중복 제거
 */
export function deduplicateMessages(
  existingHashes: Set<string>,
  newMessages: ParsedMessage[]
): ParsedMessage[] {
  return newMessages.filter(msg => !existingHashes.has(msg.hash));
}
