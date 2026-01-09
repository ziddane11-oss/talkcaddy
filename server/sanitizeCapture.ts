/**
 * P0-2: 서버 민감정보 필터링 (2차 필터)
 * 클라이언트 필터를 우회한 민감 정보를 서버에서 최종 필터링
 */

/**
 * 민감한 정보 패턴 (정규식)
 */
const SENSITIVE_PATTERNS = {
  jwt: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  bearer: /^Bearer\s+[A-Za-z0-9_\-\.]+$/i,
  apiKey: /^[A-Za-z0-9]{32,}$/,
  creditCard: /^\d{13,19}$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/,
  accountNumber: /\b\d{10,14}\b/,
};

/**
 * 민감한 필드명 키워드
 */
const SENSITIVE_KEYWORDS = [
  "password",
  "passwd",
  "pwd",
  "token",
  "apikey",
  "api_key",
  "secret",
  "authorization",
  "session",
  "cookie",
  "credit_card",
  "ssn",
  "pin",
  "otp",
];

/**
 * 값이 민감한 정보인지 확인
 */
function isSensitiveValue(value: string): boolean {
  if (!value || typeof value !== "string" || value.length < 10) return false;

  return Object.values(SENSITIVE_PATTERNS).some((pattern) => pattern.test(value));
}

/**
 * 필드명이 민감한 정보인지 확인
 */
function isSensitiveFieldName(fieldName: string): boolean {
  if (!fieldName || typeof fieldName !== "string") return false;

  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerName.includes(keyword));
}

/**
 * 단일 값 마스킹
 */
export function sanitizeValue(value: string): string {
  if (!value || typeof value !== "string") return value;

  // 민감한 패턴 감지 및 마스킹
  const patterns = [
    { pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, replacement: "[JWT]" },
    { pattern: /^Bearer\s+[A-Za-z0-9_\-\.]+$/i, replacement: "[BEARER_TOKEN]" },
    { pattern: /\b\d{13,19}\b/, replacement: "[CREDIT_CARD]" },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, replacement: "[SSN]" },
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, replacement: "[EMAIL]" },
    { pattern: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/, replacement: "[PHONE]" },
  ];

  let sanitized = value;
  patterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return sanitized;
}

/**
 * 필드명 마스킹
 */
export function sanitizeFieldName(fieldName: string): string {
  if (!fieldName || typeof fieldName !== "string") return fieldName;

  const lowerName = fieldName.toLowerCase();
  if (SENSITIVE_KEYWORDS.some((kw) => lowerName.includes(kw))) {
    return "[SENSITIVE_FIELD]";
  }

  return fieldName;
}

/**
 * 콘솔 로그 마스킹
 */
export function maskSensitivePatterns(message: string): string {
  if (!message || typeof message !== "string") return message;

  const patterns = [
    { regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, mask: "[JWT]" },
    { regex: /Bearer\s+[A-Za-z0-9_\-\.]+/gi, mask: "[TOKEN]" },
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, mask: "[EMAIL]" },
    { regex: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/g, mask: "[PHONE]" },
    { regex: /\b\d{13,19}\b/g, mask: "[CREDITCARD]" },
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, mask: "[SSN]" },
  ];

  let masked = message;
  patterns.forEach(({ regex, mask }) => {
    masked = masked.replace(regex, mask);
  });

  return masked;
}

/**
 * 에러 재현 단계 마스킹
 */
export interface ReproductionStep {
  type: string;
  fieldName?: string;
  value?: string;
  message?: string;
  [key: string]: any;
}

export function sanitizeReproductionSteps(steps: ReproductionStep[]): ReproductionStep[] {
  return steps.map((step) => {
    if (step.type === "input") {
      return {
        ...step,
        value: sanitizeValue(step.value || ""),
        fieldName: sanitizeFieldName(step.fieldName || ""),
      };
    }

    if (step.type === "console") {
      return {
        ...step,
        message: maskSensitivePatterns(step.message || ""),
      };
    }

    return step;
  });
}

/**
 * 에러 컨텍스트 마스킹
 */
export function sanitizeErrorContext(context: Record<string, any>): Record<string, any> {
  if (!context || typeof context !== "object") return context;

  const sanitized: Record<string, any> = {};

  for (const key in context) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      const value = context[key];

      // 민감한 필드명이면 마스킹
      if (isSensitiveFieldName(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "string") {
        sanitized[key] = sanitizeValue(value);
      } else if (typeof value === "object" && value !== null) {
        // 재귀적으로 객체 마스킹
        sanitized[key] = sanitizeErrorContext(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * 에러 메시지 마스킹
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== "string") return message;

  return maskSensitivePatterns(message);
}

/**
 * 스택 트레이스 마스킹
 */
export function sanitizeStackTrace(stackTrace: string): string {
  if (!stackTrace || typeof stackTrace !== "string") return stackTrace;

  return maskSensitivePatterns(stackTrace);
}
