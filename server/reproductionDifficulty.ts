/**
 * P1-3: 재현 난이도 판정 개선
 * 점수 기반 난이도 판정 시스템
 * - 입력 필드 개수
 * - 클릭 이벤트 개수
 * - 네트워크 상태 복잡도
 * - 타이밍 의존도
 */

export type ReproductionDifficulty = "easy" | "medium" | "hard" | "very_hard";

export interface ReproductionDifficultyScore {
  difficulty: ReproductionDifficulty;
  score: number; // 0-100
  factors: {
    inputComplexity: number; // 0-30
    interactionComplexity: number; // 0-30
    networkComplexity: number; // 0-20
    timingDependency: number; // 0-20
  };
  explanation: string;
}

/**
 * 입력 복잡도 계산
 */
function calculateInputComplexity(userInputs: any[]): number {
  if (!userInputs || userInputs.length === 0) return 0;

  let score = 0;

  // 입력 필드 개수 (최대 10점)
  score += Math.min(userInputs.length * 2, 10);

  // 입력 유형 다양성 (최대 10점)
  const inputTypes = new Set(userInputs.map((i) => i.type));
  score += Math.min(inputTypes.size * 3, 10);

  // 입력 값 길이 (최대 10점)
  const avgLength = userInputs.reduce((sum, i) => sum + (i.value?.length || 0), 0) / userInputs.length;
  score += Math.min((avgLength / 10) * 10, 10);

  return Math.min(score, 30);
}

/**
 * 상호작용 복잡도 계산
 */
function calculateInteractionComplexity(clickEvents: any[], navigationCount: number = 0): number {
  if (!clickEvents || clickEvents.length === 0) return navigationCount * 5;

  let score = 0;

  // 클릭 이벤트 개수 (최대 15점)
  score += Math.min(clickEvents.length * 1.5, 15);

  // 클릭 타입 다양성 (최대 10점)
  const clickTypes = new Set(clickEvents.map((c) => c.type || "click"));
  score += Math.min(clickTypes.size * 3, 10);

  // 네비게이션 복잡도 (최대 5점)
  score += Math.min(navigationCount * 5, 5);

  return Math.min(score, 30);
}

/**
 * 네트워크 복잡도 계산
 */
function calculateNetworkComplexity(networkStatus: any, asyncCount: number = 0): number {
  if (!networkStatus) return asyncCount * 2;

  let score = 0;

  // 네트워크 상태 변화 (최대 10점)
  if (networkStatus.changes && networkStatus.changes.length > 0) {
    score += Math.min(networkStatus.changes.length * 2, 10);
  }

  // 느린 네트워크 (최대 5점)
  if (networkStatus.isSlowNetwork) {
    score += 5;
  }

  // 오프라인 상태 (최대 5점)
  if (networkStatus.hasOfflineState) {
    score += 5;
  }

  // 비동기 작업 (최대 5점)
  score += Math.min(asyncCount * 2, 5);

  return Math.min(score, 20);
}

/**
 * 타이밍 의존도 계산
 */
function calculateTimingDependency(
  consoleLogs: any[],
  timeoutCount: number = 0,
  retryCount: number = 0
): number {
  let score = 0;

  // 타이밍 관련 로그 (최대 8점)
  if (consoleLogs && consoleLogs.length > 0) {
    const timingLogs = consoleLogs.filter((log) =>
      log.message?.toLowerCase().includes("timeout") ||
      log.message?.toLowerCase().includes("delay") ||
      log.message?.toLowerCase().includes("retry")
    );
    score += Math.min(timingLogs.length * 2, 8);
  }

  // 타임아웃 (최대 6점)
  score += Math.min(timeoutCount * 3, 6);

  // 재시도 로직 (최대 6점)
  score += Math.min(retryCount * 3, 6);

  return Math.min(score, 20);
}

/**
 * 재현 난이도 판정 (점수 기반)
 */
export function calculateReproductionDifficulty(reproductionData: {
  userInputs?: any[];
  clickEvents?: any[];
  networkStatus?: any;
  consoleLogs?: any[];
  navigationCount?: number;
  asyncCount?: number;
  timeoutCount?: number;
  retryCount?: number;
}): ReproductionDifficultyScore {
  // 각 요소별 복잡도 계산
  const inputComplexity = calculateInputComplexity(reproductionData.userInputs || []);
  const interactionComplexity = calculateInteractionComplexity(
    reproductionData.clickEvents || [],
    reproductionData.navigationCount || 0
  );
  const networkComplexity = calculateNetworkComplexity(
    reproductionData.networkStatus,
    reproductionData.asyncCount || 0
  );
  const timingDependency = calculateTimingDependency(
    reproductionData.consoleLogs || [],
    reproductionData.timeoutCount || 0,
    reproductionData.retryCount || 0
  );

  // 총점 계산 (0-100)
  const totalScore = inputComplexity + interactionComplexity + networkComplexity + timingDependency;

  // 난이도 판정
  let difficulty: ReproductionDifficulty;
  let explanation = "";

  if (totalScore < 25) {
    difficulty = "easy";
    explanation = "재현이 간단합니다. 몇 번의 클릭과 입력으로 재현 가능합니다.";
  } else if (totalScore < 50) {
    difficulty = "medium";
    explanation = "재현이 중간 정도의 복잡도를 가집니다. 여러 단계의 상호작용이 필요합니다.";
  } else if (totalScore < 75) {
    difficulty = "hard";
    explanation = "재현이 어렵습니다. 특정 네트워크 상태나 타이밍이 중요합니다.";
  } else {
    difficulty = "very_hard";
    explanation = "재현이 매우 어렵습니다. 복잡한 상호작용과 특정 조건이 필요합니다.";
  }

  return {
    difficulty,
    score: Math.min(totalScore, 100),
    factors: {
      inputComplexity,
      interactionComplexity,
      networkComplexity,
      timingDependency,
    },
    explanation,
  };
}

/**
 * 난이도 레벨 설명
 */
export function getDifficultyDescription(difficulty: ReproductionDifficulty): string {
  const descriptions: Record<ReproductionDifficulty, string> = {
    easy: "🟢 쉬움 - 재현이 간단하며 몇 번의 클릭으로 가능합니다.",
    medium: "🟡 중간 - 여러 단계의 상호작용이 필요합니다.",
    hard: "🔴 어려움 - 특정 조건이나 타이밍이 중요합니다.",
    very_hard: "🔴🔴 매우 어려움 - 복잡한 조건들이 필요합니다.",
  };

  return descriptions[difficulty];
}

/**
 * 난이도별 재현 가이드
 */
export function getReproductionGuide(difficulty: ReproductionDifficulty): string {
  const guides: Record<ReproductionDifficulty, string> = {
    easy: `
1. 제공된 단계를 순서대로 따릅니다.
2. 각 입력 필드에 정확히 입력합니다.
3. 버튼을 클릭합니다.
4. 에러가 발생하는지 확인합니다.
    `,
    medium: `
1. 제공된 단계를 정확히 따릅니다.
2. 각 단계 사이의 대기 시간을 유지합니다.
3. 네트워크 상태를 확인합니다.
4. 필요시 페이지를 새로고침하고 다시 시도합니다.
    `,
    hard: `
1. 제공된 단계를 정확히 따릅니다.
2. 네트워크 상태를 주의깊게 모니터링합니다.
3. 타이밍을 정확히 맞춥니다.
4. 콘솔 로그를 확인하여 에러 메시지를 추적합니다.
5. 여러 번 시도해야 할 수 있습니다.
    `,
    very_hard: `
1. 제공된 단계를 매우 정확히 따릅니다.
2. 개발자 도구를 열어 네트워크 탭을 모니터링합니다.
3. 콘솔 로그를 자세히 확인합니다.
4. 타이밍을 정확히 맞춥니다.
5. 필요시 개발팀에 문의하세요.
    `,
  };

  return guides[difficulty];
}
