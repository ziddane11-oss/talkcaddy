import { getDb } from "./db";
import { errorReproductionSteps, errorLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 에러 재현 정보 수집 및 저장
 * 사용자 입력값, 브라우저 정보, 네트워크 상태 등을 기록하여 버그 재현 시간 단축
 */

export interface ReproductionContext {
  userInputs?: Record<string, any>;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
  };
  networkStatus?: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  previousPage?: string;
  currentPage: string;
  clickEvents?: Array<{
    target: string;
    timestamp: number;
    x: number;
    y: number;
  }>;
  consoleLogs?: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: number;
  }>;
}

/**
 * 에러 재현 정보 저장
 */
export async function recordErrorReproduction(
  errorLogId: number,
  context: ReproductionContext
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // 재현 난이도 판정
    let reproductionDifficulty: "easy" | "medium" | "hard" = "medium";

    // 재현 단계 생성
    const reproductionSteps = generateReproductionSteps(context);

    // 재현 난이도 판정 로직
    if (context.clickEvents && context.clickEvents.length <= 2) {
      reproductionDifficulty = "easy";
    } else if (context.clickEvents && context.clickEvents.length > 5) {
      reproductionDifficulty = "hard";
    }

    await db.insert(errorReproductionSteps).values({
      errorLogId,
      userInputs: context.userInputs ? JSON.stringify(context.userInputs) : null,
      browserInfo: context.browserInfo ? JSON.stringify(context.browserInfo) : null,
      networkStatus: context.networkStatus ? JSON.stringify(context.networkStatus) : null,
      previousPage: context.previousPage || null,
      currentPage: context.currentPage,
      clickEvents: context.clickEvents ? JSON.stringify(context.clickEvents) : null,
      consoleLogs: context.consoleLogs ? JSON.stringify(context.consoleLogs) : null,
      reproductionDifficulty,
      reproductionSteps,
    });

    console.log(`[ERROR_REPRODUCTION] Recorded for error ${errorLogId}`);
  } catch (error) {
    console.error("[ERROR_REPRODUCTION_FAILED]", error);
  }
}

/**
 * 재현 단계 자동 생성
 */
function generateReproductionSteps(context: ReproductionContext): string {
  const steps: string[] = [];

  // 1. 이전 페이지 정보
  if (context.previousPage) {
    steps.push(`1. 이전 페이지에서 이동: ${context.previousPage}`);
  }

  // 2. 현재 페이지
  steps.push(`${steps.length + 1}. 페이지 진입: ${context.currentPage}`);

  // 3. 클릭 이벤트 재현
  if (context.clickEvents && context.clickEvents.length > 0) {
    context.clickEvents.forEach((event, index) => {
      steps.push(
        `${steps.length + 1}. 클릭: ${event.target} (좌표: ${event.x}, ${event.y})`
      );
    });
  }

  // 4. 사용자 입력값
  if (context.userInputs && Object.keys(context.userInputs).length > 0) {
    const inputs = Object.entries(context.userInputs)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
    steps.push(`${steps.length + 1}. 입력값 입력: ${inputs}`);
  }

  // 5. 에러 발생
  steps.push(`${steps.length + 1}. 에러 발생`);

  return steps.join("\n");
}

/**
 * 에러 재현 정보 조회
 */
export async function getErrorReproductionInfo(errorLogId: number) {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(errorReproductionSteps)
      .where(eq(errorReproductionSteps.errorLogId, errorLogId))
      .limit(1);

    if (result.length === 0) return null;

    const record = result[0];

    return {
      ...record,
      userInputs: record.userInputs ? JSON.parse(record.userInputs) : null,
      browserInfo: record.browserInfo ? JSON.parse(record.browserInfo) : null,
      networkStatus: record.networkStatus ? JSON.parse(record.networkStatus) : null,
      clickEvents: record.clickEvents ? JSON.parse(record.clickEvents) : null,
      consoleLogs: record.consoleLogs ? JSON.parse(record.consoleLogs) : null,
    };
  } catch (error) {
    console.error("[ERROR_REPRODUCTION_QUERY_FAILED]", error);
    return null;
  }
}

/**
 * 재현 난이도별 에러 조회
 */
export async function getErrorsByReproductionDifficulty(
  difficulty: "easy" | "medium" | "hard"
) {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        errorId: errorReproductionSteps.errorLogId,
        errorCode: errorLogs.errorCode,
        errorMessage: errorLogs.errorMessage,
        difficulty: errorReproductionSteps.reproductionDifficulty,
        steps: errorReproductionSteps.reproductionSteps,
        createdAt: errorReproductionSteps.createdAt,
      })
      .from(errorReproductionSteps)
      .innerJoin(errorLogs, eq(errorReproductionSteps.errorLogId, errorLogs.id))
      .where(eq(errorReproductionSteps.reproductionDifficulty, difficulty));

    return result;
  } catch (error) {
    console.error("[ERROR_DIFFICULTY_QUERY_FAILED]", error);
    return [];
  }
}
