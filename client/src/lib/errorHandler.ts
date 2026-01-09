/**
 * 프론트엔드 에러 핸들러
 * 글로벌 에러 캡처 및 로깅
 */

export interface FrontendError {
  type: "uncaught_error" | "unhandled_rejection" | "console_error";
  message: string;
  stack?: string;
  url?: string;
  timestamp: number;
}

const errorLog: FrontendError[] = [];
const MAX_ERRORS = 50; // 최대 50개 에러 저장

/**
 * 에러를 로컬 스토리지에 저장
 */
export function captureError(error: FrontendError): void {
  errorLog.push(error);

  // 최대 개수 초과 시 오래된 것부터 제거
  if (errorLog.length > MAX_ERRORS) {
    errorLog.shift();
  }

  // 콘솔에 출력
  console.error(`[ERROR_CAPTURE] ${error.type}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(error.timestamp).toISOString(),
  });

  // 로컬 스토리지에 저장 (개발자 도구에서 확인 가능)
  try {
    localStorage.setItem("talkcaddy_errors", JSON.stringify(errorLog));
  } catch (e) {
    console.warn("[ERROR_CAPTURE] Failed to save to localStorage:", e);
  }
}

/**
 * 저장된 에러 로그 조회
 */
export function getErrorLog(): FrontendError[] {
  return [...errorLog];
}

/**
 * 에러 로그 초기화
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
  try {
    localStorage.removeItem("talkcaddy_errors");
  } catch (e) {
    console.warn("[ERROR_CAPTURE] Failed to clear localStorage:", e);
  }
}

/**
 * 글로벌 에러 핸들러 설정
 */
export function setupGlobalErrorHandlers(): void {
  // 1. Uncaught errors
  window.addEventListener("error", (event: ErrorEvent) => {
    captureError({
      type: "uncaught_error",
      message: event.message,
      stack: event.error?.stack,
      url: event.filename,
      timestamp: Date.now(),
    });
  });

  // 2. Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const error = event.reason;
    captureError({
      type: "unhandled_rejection",
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: Date.now(),
    });
  });

  // 3. Console errors (개발 환경)
  if (process.env.NODE_ENV === "development") {
    const originalError = console.error;
    console.error = function (...args: any[]) {
      originalError.apply(console, args);

      // 첫 번째 인자가 에러 객체인 경우
      if (args[0] instanceof Error) {
        captureError({
          type: "console_error",
          message: args[0].message,
          stack: args[0].stack,
          timestamp: Date.now(),
        });
      } else if (typeof args[0] === "string" && args[0].startsWith("[")) {
        // 로깅 태그가 있는 경우 (예: "[ERROR]")
        captureError({
          type: "console_error",
          message: args.join(" "),
          timestamp: Date.now(),
        });
      }
    };
  }
}

/**
 * 에러 로그를 JSON으로 내보내기
 */
export function exportErrorLog(): string {
  return JSON.stringify(errorLog, null, 2);
}

/**
 * 에러 로그를 파일로 다운로드
 */
export function downloadErrorLog(): void {
  const data = exportErrorLog();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `talkcaddy-errors-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
