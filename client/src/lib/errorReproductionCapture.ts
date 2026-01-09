/**
 * 프론트엔드에서 에러 재현 정보 수집
 * 사용자 입력, 클릭 이벤트, 콘솔 로그 등을 기록
 */

export interface CapturedReproductionContext {
  userInputs: Record<string, any>;
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
  };
  networkStatus: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  previousPage: string | null;
  currentPage: string;
  clickEvents: Array<{
    target: string;
    timestamp: number;
    x: number;
    y: number;
  }>;
  consoleLogs: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: number;
  }>;
}

class ErrorReproductionCapture {
  private userInputs: Record<string, any> = {};
  private clickEvents: Array<{
    target: string;
    timestamp: number;
    x: number;
    y: number;
  }> = [];
  private consoleLogs: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: number;
  }> = [];
  private maxClickEvents = 20;
  private maxConsoleLogs = 50;

  constructor() {
    this.setupInputCapture();
    this.setupClickCapture();
    this.setupConsoleCapture();
  }

  /**
   * 입력값 캡처 설정
   */
  private setupInputCapture() {
    document.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        const name = target.name || target.id || target.className;
        this.userInputs[name] = {
          value: target.value.substring(0, 100), // 최대 100자
          type: target.type || "text",
          timestamp: Date.now(),
        };
      }
    });
  }

  /**
   * 클릭 이벤트 캡처 설정
   */
  private setupClickCapture() {
    document.addEventListener("click", (event) => {
      if (this.clickEvents.length >= this.maxClickEvents) {
        this.clickEvents.shift(); // 가장 오래된 이벤트 제거
      }

      const target = event.target as HTMLElement;
      const targetInfo = this.getElementInfo(target);

      this.clickEvents.push({
        target: targetInfo,
        timestamp: Date.now(),
        x: event.clientX,
        y: event.clientY,
      });
    });
  }

  /**
   * 콘솔 로그 캡처 설정
   */
  private setupConsoleCapture() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      this.addConsoleLog("log", args.join(" "));
      originalLog(...args);
    };

    console.warn = (...args: any[]) => {
      this.addConsoleLog("warn", args.join(" "));
      originalWarn(...args);
    };

    console.error = (...args: any[]) => {
      this.addConsoleLog("error", args.join(" "));
      originalError(...args);
    };
  }

  /**
   * 콘솔 로그 추가
   */
  private addConsoleLog(level: "log" | "warn" | "error", message: string) {
    if (this.consoleLogs.length >= this.maxConsoleLogs) {
      this.consoleLogs.shift();
    }

    this.consoleLogs.push({
      level,
      message: message.substring(0, 200), // 최대 200자
      timestamp: Date.now(),
    });
  }

  /**
   * HTML 요소 정보 추출
   */
  private getElementInfo(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes = element.className ? `.${element.className.split(" ").join(".")}` : "";
    const text = element.textContent?.substring(0, 30) || "";

    return `${tag}${id}${classes}${text ? ` (${text})` : ""}`;
  }

  /**
   * 브라우저 정보 수집
   */
  private getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };
  }

  /**
   * 네트워크 상태 수집
   */
  private getNetworkStatus() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection;
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }

  /**
   * 전체 재현 정보 수집
   */
  public captureAll(): CapturedReproductionContext {
    return {
      userInputs: this.userInputs,
      browserInfo: this.getBrowserInfo(),
      networkStatus: this.getNetworkStatus(),
      previousPage: document.referrer || null,
      currentPage: window.location.href,
      clickEvents: this.clickEvents,
      consoleLogs: this.consoleLogs,
    };
  }

  /**
   * 재현 정보 초기화
   */
  public reset() {
    this.userInputs = {};
    this.clickEvents = [];
    this.consoleLogs = [];
  }
}

// 전역 인스턴스
export const errorReproductionCapture = new ErrorReproductionCapture();

/**
 * 에러 발생 시 재현 정보 전송
 */
export async function sendReproductionData(errorLogId: number) {
  try {
    const context = errorReproductionCapture.captureAll();

    const response = await fetch("/api/trpc/admin.recordErrorReproduction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        errorLogId,
        context,
      }),
    });

    if (!response.ok) {
      console.warn("Failed to send reproduction data:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending reproduction data:", error);
  }
}
