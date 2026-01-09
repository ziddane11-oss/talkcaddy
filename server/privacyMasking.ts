/**
 * ChatGPT 검토사항: 개인정보 마스킹
 * 전화번호, 계좌번호, 주소 등 민감 정보 자동 마스킹
 */

interface MaskingResult {
  maskedText: string;
  hasSensitiveInfo: boolean;
  detectedTypes: string[];
}

/**
 * 전화번호 패턴 감지 및 마스킹
 * - 010-1234-5678
 * - 01012345678
 * - 02-123-4567
 */
function maskPhoneNumber(text: string): string {
  // 하이픈 있는 경우
  text = text.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/g, (match, p1, p2, p3) => {
    return `${p1}-****-${p3.slice(-2)}**`;
  });
  
  // 하이픈 없는 경우 (010으로 시작하는 11자리)
  text = text.replace(/(?<!\d)(010)(\d{4})(\d{4})(?!\d)/g, (match, p1, p2, p3) => {
    return `${p1}****${p3.slice(-2)}**`;
  });
  
  return text;
}

/**
 * 계좌번호 패턴 감지 및 마스킹
 * - 123-456-789012
 * - 123456789012 (10~14자리 숫자)
 */
function maskBankAccount(text: string): string {
  // 하이픈 있는 계좌번호
  text = text.replace(/(\d{2,4})-(\d{2,6})-(\d{2,8})/g, (match, p1, p2, p3) => {
    return `${p1}-****-****`;
  });
  
  // 하이픈 없는 긴 숫자 (10~14자리)
  text = text.replace(/(?<!\d)(\d{10,14})(?!\d)/g, (match) => {
    return match.slice(0, 3) + "****" + match.slice(-3);
  });
  
  return text;
}

/**
 * 주소 패턴 감지 및 마스킹
 * - 서울특별시 강남구 테헤란로 123
 * - 경기도 성남시 분당구 판교역로 123
 */
function maskAddress(text: string): string {
  // 시/도 + 구/군 패턴
  text = text.replace(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별시|광역시|도)?\s*([가-힣]+[시군구])\s*([가-힣0-9\s-]+)/g, 
    (match, p1, p2, p3) => {
      return `${p1}${p2 || ""} ${p3} [주소 마스킹]`;
    }
  );
  
  return text;
}

/**
 * 이메일 패턴 감지 및 마스킹
 * - example@domain.com → ex****@domain.com
 */
function maskEmail(text: string): string {
  text = text.replace(/([a-zA-Z0-9._-]{2,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, 
    (match, username, domain) => {
      const masked = username.slice(0, 2) + "****";
      return `${masked}@${domain}`;
    }
  );
  
  return text;
}

/**
 * 주민등록번호 패턴 감지 및 마스킹
 * - 123456-1234567 → 123456-*******
 */
function maskResidentNumber(text: string): string {
  text = text.replace(/(\d{6})-(\d{7})/g, (match, p1, p2) => {
    return `${p1}-*******`;
  });
  
  return text;
}

/**
 * 종합 마스킹 함수
 */
export function maskSensitiveInfo(text: string): MaskingResult {
  const detectedTypes: string[] = [];
  let maskedText = text;
  
  // 전화번호 감지
  if (/(\d{2,3})-(\d{3,4})-(\d{4})|010\d{8}/.test(text)) {
    detectedTypes.push("전화번호");
    maskedText = maskPhoneNumber(maskedText);
  }
  
  // 계좌번호 감지
  if (/(\d{2,4})-(\d{2,6})-(\d{2,8})|\d{10,14}/.test(text)) {
    detectedTypes.push("계좌번호");
    maskedText = maskBankAccount(maskedText);
  }
  
  // 주소 감지
  if (/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별시|광역시|도)?\s*([가-힣]+[시군구])/.test(text)) {
    detectedTypes.push("주소");
    maskedText = maskAddress(maskedText);
  }
  
  // 이메일 감지
  if (/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    detectedTypes.push("이메일");
    maskedText = maskEmail(maskedText);
  }
  
  // 주민등록번호 감지
  if (/\d{6}-\d{7}/.test(text)) {
    detectedTypes.push("주민등록번호");
    maskedText = maskResidentNumber(maskedText);
  }
  
  return {
    maskedText,
    hasSensitiveInfo: detectedTypes.length > 0,
    detectedTypes,
  };
}

/**
 * 메시지 배열 마스킹
 */
export function maskMessages(messages: Array<{ speaker: string; content: string }>): Array<{ speaker: string; content: string; masked: boolean }> {
  return messages.map(msg => {
    const result = maskSensitiveInfo(msg.content);
    return {
      speaker: msg.speaker,
      content: result.maskedText,
      masked: result.hasSensitiveInfo,
    };
  });
}
