/**
 * 배포 도메인 기반 URL 생성 유틸
 * 초대 링크, API 호출 등에서 사용
 * 
 * 환경변수 우선순위:
 * 1. VITE_APP_URL (배포 환경에서 설정)
 * 2. window.location.origin (개발/preview 환경)
 * 3. 기본값: https://talkcaddy-nnm5gwq6.manus.space
 */

export function getAppBaseUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const envUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? "";

  // ✅ 배포 환경(= origin이 localhost 아님)에서는 origin을 무조건 우선
  // 이렇게 하면 env 실수로 localhost가 박혀도 배포에서는 정상 작동
  if (origin && !origin.includes("localhost")) {
    return origin.replace(/\/$/, "");
  }

  // dev/로컬에서는 env 또는 origin 사용
  return (envUrl || origin || "https://talkcaddy-nnm5gwq6.manus.space").replace(/\/$/, "");
}

/**
 * 베타 초대 링크 생성
 * @param token 초대 토큰
 * @returns 완전한 초대 링크 URL
 */
export function buildInviteUrl(token: string): string {
  return `${getAppBaseUrl()}/beta/accept/${token}`;
}

/**
 * API 기본 URL 생성
 * @returns tRPC API 기본 URL
 * 
 * 로컬 개발 환경에서는 상대 경로 사용
 * 배포 환경에서는 절대 경로 사용
 */
export function getApiBaseUrl(): string {
  // 로컬 개발 환경 (localhost)
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "/api/trpc";
  }
  
  // 배포 환경 (배포 도메인)
  return `${getAppBaseUrl()}/api/trpc`;
}
