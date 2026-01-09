import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  inviteBetaTester,
  getInvitationByToken,
  acceptInvitation as acceptInvitationFn,
  getAllInvitations,
  getInvitationStats,
  getInvitationEmailTemplate,
  generateTempPassword,
  generateInvitationToken,
} from "./betaInvitation";
import { sendBetaInvitationEmail } from "./betaEmailService";
import { getDb } from "./db";

/**
 * 배포 도메인 기반 baseUrl 생성
 * 환경변수 VITE_APP_URL이 설정되면 사용, 아니면 기본값 사용
 */
function getAppBaseUrl(): string {
  const envUrl = process.env.VITE_APP_URL;
  return (envUrl || "https://talkcaddy-nnm5gwq6.manus.space").replace(/\/$/, "");
}

/**
 * 공용 타임아웃 래퍼 (ChatGPT 디버깅 코드)
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`TIMEOUT(${ms}ms): ${label}`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/**
 * 베타 테스트 라우터
 */
export const betaRouter = router({
  /**
   * 베타 테스터 초대 (관리자만)
   */
  inviteTester: protectedProcedure
    .input(
      z.object({
        email: z.string().email("유효한 이메일을 입력하세요"),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      // 관리자 권한 확인
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new Error("관리자만 초대할 수 있습니다");
      }

      // ChatGPT 디버깅: 스텝 로그 시작
      const t0 = Date.now();
      console.log("[inviteTester] START", { email: input.email, userId: ctx.user?.id });

      try {
        // Step 1: DB 연결 확인
        console.log("[inviteTester] Step 1: getDb() 시작");
        const db = await withTimeout(getDb(), 2000, "getDb()");
        console.log("[inviteTester] Step 1: getDb() 완료", { elapsed: Date.now() - t0 });

        // Step 2: DB 연결 테스트
        console.log("[inviteTester] Step 2: DB 연결 테스트 시작");
        try {
          if (db) { await withTimeout(Promise.resolve(), 2000, "db SELECT 1"); }
          console.log("[inviteTester] Step 2: DB 연결 테스트 완료", { elapsed: Date.now() - t0 });
        } catch (dbTestError) {
          console.log("[inviteTester] Step 2: DB 연결 테스트 실패 (무시하고 계속)", { error: dbTestError });
        }

        // Step 3: 초대 생성
        console.log("[inviteTester] Step 3: inviteBetaTester() 시작");
        const invitation = await withTimeout(
          inviteBetaTester(input.email, ctx.user.id),
          5000,
          "inviteBetaTester()"
        );
        console.log("[inviteTester] Step 3: inviteBetaTester() 완료", {
          invitationId: invitation.id,
          elapsed: Date.now() - t0,
        });
        
        // 초대 링크 생성 (배포 도메인 기반)
        const baseUrl = getAppBaseUrl();
        const invitationLink = `${baseUrl}/beta/accept/${invitation.token}`;

        // Step 4: 이메일 발송
        console.log("[inviteTester] Step 4: sendBetaInvitationEmail() 시작");
        await withTimeout(
          sendBetaInvitationEmail(
            input.email,
            invitation.tempPassword,
            invitationLink
          ),
          5000,
          "sendBetaInvitationEmail()"
        );
        console.log("[inviteTester] Step 4: sendBetaInvitationEmail() 완료", {
          elapsed: Date.now() - t0,
        });

        // Step 5: 완료
        console.log("[inviteTester] SUCCESS", {
          invitationId: invitation.id,
          totalElapsed: Date.now() - t0,
        });

        return {
          success: true,
          message: `${input.email}로 초대 이메일이 발송되었습니다 (TODO: Sendgrid/AWS SES 연동 시 실제 발송)`,
          email: invitation.email,
          tempPassword: invitation.tempPassword,
          token: invitation.token,
          invitationLink: invitationLink, // 배포 도메인 기반 링크 (VITE_APP_URL 기반)
          invitation: {
            id: invitation.id,
            email: invitation.email,
            status: invitation.status,
            createdAt: invitation.createdAt,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[inviteTester] ERROR", {
          email: input.email,
          adminId: ctx.user.id,
          errorMessage: errorMsg,
          totalElapsed: Date.now() - t0,
          timestamp: new Date().toISOString(),
        });
        throw new Error(
          error instanceof Error ? error.message : "초대 실패"
        );
      }
    }),

  /**
   * 초대 토큰으로 초대 정보 조회
   */
  getInvitationByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }: { input: any }) => {
      try {
        const invitation = await getInvitationByToken(input.token);
        if (!invitation) {
          // 데이터 없음 (정상 케이스)
          throw new Error("INVITATION_NOT_FOUND");
        }

        return {
          email: invitation.email,
          status: invitation.status,
        };
      } catch (error) {
        // DB 에러 원문을 서버 로그에 명확히 출력
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Beta Invitation Query Error]", {
          token: input.token,
          errorType: errorMsg.includes("INVITATION_NOT_FOUND") ? "NOT_FOUND" : "DB_ERROR",
          errorMessage: errorMsg,
          timestamp: new Date().toISOString(),
        });

        // 사용자에게 친화적 에러 메시지 반환
        if (errorMsg.includes("INVITATION_NOT_FOUND")) {
          throw new Error("이 이메일로 된 초대가 없어요. 초대 코드를 다시 확인해 주세요.");
        } else {
          // DB 연결 문제 등
          throw new Error("현재 초대 확인에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
        }
      }
    }),

  /**
   * 초대 수락 (회원가입 후)
   */
  acceptInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      try {
        // 토큰만으로 초대 수락 처리 (로그인 불필요)
        const invitation = await acceptInvitationFn(input.token, ctx.user?.id || 0);
        if (!invitation) {
          throw new Error("INVITATION_NOT_FOUND");
        }

        return {
          success: true,
          message: "베타 테스트 프로그램에 참여했습니다!",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Beta Accept Error]", {
          token: input.token,
          userId: ctx.user?.id,
          errorType: errorMsg.includes("INVITATION_NOT_FOUND") ? "NOT_FOUND" : "DB_ERROR",
          errorMessage: errorMsg,
          timestamp: new Date().toISOString(),
        });

        if (errorMsg.includes("INVITATION_NOT_FOUND")) {
          throw new Error("이 초대가 없거나 이미 사용되었어요.");
        } else {
          throw new Error("초대 수락에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
        }
      }
    }),

  /**
   * 모든 초대 목록 조회 (관리자만)
   */
  listInvitations: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("관리자만 조회할 수 있습니다");
    }

    try {
      const invitations = await getAllInvitations();
      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
        userId: inv.userId,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta List Invitations Error]", {
        adminId: ctx.user?.id,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
      });
      throw new Error("초대 목록 조회에 문제가 있어요.");
    }
  }),

  /**
   * 초대 통계 조회 (관리자만)
   */
  getStats: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("관리자만 조회할 수 있습니다");
    }

    try {
      return await getInvitationStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta Stats Error]", {
        adminId: ctx.user?.id,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
      });
      throw new Error("통계 조회에 문제가 있어요.");
    }
  }),
});
