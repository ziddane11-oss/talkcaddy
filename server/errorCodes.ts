/**
 * API 에러 코드 표준화
 * 모든 파이프라인 에러는 이 코드를 사용하여 일관된 에러 처리 제공
 */

export const ERROR_CODES = {
  // OCR 관련 에러
  OCR_EMPTY: "OCR_EMPTY",           // OCR 결과가 비어있음
  OCR_INVALID_FORMAT: "OCR_INVALID_FORMAT",  // OCR 결과 형식 오류
  UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",    // 지원하지 않는 이미지 형식
  IMAGE_CORRUPTED: "IMAGE_CORRUPTED",        // 이미지 파일 손상

  // 컨텍스트 관련 에러
  CONTEXT_TOO_SHORT: "CONTEXT_TOO_SHORT",    // 메시지가 너무 짧음 (최소 10자)
  CONTEXT_MISSING: "CONTEXT_MISSING",        // 대화 맥락 없음
  CONTEXT_AMBIGUOUS: "CONTEXT_AMBIGUOUS",    // 대화 해석이 애매함

  // AI 모델 관련 에러
  MODEL_TIMEOUT: "MODEL_TIMEOUT",            // AI 모델 응답 시간 초과
  MODEL_ERROR: "MODEL_ERROR",                // AI 모델 에러
  INVALID_RESPONSE: "INVALID_RESPONSE",      // AI 응답 검증 실패

  // 리소스 관련 에러
  UPLOAD_NOT_FOUND: "UPLOAD_NOT_FOUND",      // 업로드 기록 없음
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",  // 대화방 없음
  RATE_LIMIT: "RATE_LIMIT",                  // API 호출 제한 초과

  // 기타 에러
  INVALID_INPUT: "INVALID_INPUT",            // 입력값 검증 실패
  INTERNAL_ERROR: "INTERNAL_ERROR",          // 내부 서버 에러
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * 에러 코드별 HTTP 상태 코드 매핑
 */
export const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODES.OCR_EMPTY]: 400,
  [ERROR_CODES.OCR_INVALID_FORMAT]: 400,
  [ERROR_CODES.UNSUPPORTED_IMAGE]: 400,
  [ERROR_CODES.IMAGE_CORRUPTED]: 400,
  [ERROR_CODES.CONTEXT_TOO_SHORT]: 400,
  [ERROR_CODES.CONTEXT_MISSING]: 400,
  [ERROR_CODES.CONTEXT_AMBIGUOUS]: 400,
  [ERROR_CODES.MODEL_TIMEOUT]: 504,
  [ERROR_CODES.MODEL_ERROR]: 500,
  [ERROR_CODES.INVALID_RESPONSE]: 500,
  [ERROR_CODES.UPLOAD_NOT_FOUND]: 404,
  [ERROR_CODES.CONVERSATION_NOT_FOUND]: 404,
  [ERROR_CODES.RATE_LIMIT]: 429,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

/**
 * 에러 코드별 사용자 친화적 메시지
 */
export const ERROR_CODE_TO_MESSAGE: Record<ErrorCode, string> = {
  [ERROR_CODES.OCR_EMPTY]: "스크린샷에서 대화 내용을 찾을 수 없습니다. 다시 시도해주세요.",
  [ERROR_CODES.OCR_INVALID_FORMAT]: "스크린샷 형식을 인식할 수 없습니다. 카카오톡 대화 스크린샷을 올려주세요.",
  [ERROR_CODES.UNSUPPORTED_IMAGE]: "지원하지 않는 이미지 형식입니다. (JPG, PNG 지원)",
  [ERROR_CODES.IMAGE_CORRUPTED]: "이미지 파일이 손상되었습니다. 다시 올려주세요.",
  [ERROR_CODES.CONTEXT_TOO_SHORT]: "입력 텍스트가 너무 짧습니다. 최소 10자 이상 입력해주세요.",
  [ERROR_CODES.CONTEXT_MISSING]: "분석할 대화 내용이 없습니다. 스크린샷을 올리거나 텍스트를 입력해주세요.",
  [ERROR_CODES.CONTEXT_AMBIGUOUS]: "대화 내용이 애매합니다. 더 자세한 상황을 설명해주세요.",
  [ERROR_CODES.MODEL_TIMEOUT]: "AI 분석이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.",
  [ERROR_CODES.MODEL_ERROR]: "AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
  [ERROR_CODES.INVALID_RESPONSE]: "AI 응답이 올바르지 않습니다. 다시 시도해주세요.",
  [ERROR_CODES.UPLOAD_NOT_FOUND]: "업로드 기록을 찾을 수 없습니다.",
  [ERROR_CODES.CONVERSATION_NOT_FOUND]: "대화방을 찾을 수 없습니다.",
  [ERROR_CODES.RATE_LIMIT]: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  [ERROR_CODES.INVALID_INPUT]: "입력값이 올바르지 않습니다.",
  [ERROR_CODES.INTERNAL_ERROR]: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

/**
 * 커스텀 API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: Record<string, any>
  ) {
    super(message || ERROR_CODE_TO_MESSAGE[code]);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
