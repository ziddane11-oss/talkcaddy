import crypto from "crypto";
import { getDb } from "./db";
import { betaInvitations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 베타 테스트 초대 시스템 (DB 기반)
 * 서버 재시작 후에도 데이터 유지
 */

interface BetaInvitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  tempPassword: string;
  token: string;
  expiresAt: Date;
  userId?: number;
  createdAt: Date;
  acceptedAt?: Date;
}

/**
 * 임시 비밀번호 생성
 */
export function generateTempPassword(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * 초대 토큰 생성
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 베타 테스터 초대
 */
export async function inviteBetaTester(
  email: string,
  invitedBy: number
): Promise<BetaInvitation> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 1. 중복 확인 (DB 조회)
  const existing = await db
    .select()
    .from(betaInvitations)
    .where(eq(betaInvitations.email, email));

  if (existing.length > 0) {
    throw new Error("이미 초대된 이메일입니다");
  }

  const tempPassword = generateTempPassword();
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

  const invitation = {
    id: crypto.randomUUID(),
    email,
    status: "pending" as const,
    tempPassword,
    token,
    expiresAt,
    createdAt: new Date(),
  };

  // 2. DB 저장
  await db.insert(betaInvitations).values(invitation);

  return {
    ...invitation,
    userId: undefined,
    acceptedAt: undefined,
  };
}

/**
 * 초대 토큰으로 초대 정보 조회
 */
export async function getInvitationByToken(
  token: string
): Promise<BetaInvitation | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(betaInvitations)
    .where(eq(betaInvitations.token, token));

  if (result.length === 0) return null;

  const invitation = result[0];

  // 토큰 만료 확인
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return null;
  }

  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status as "pending" | "accepted" | "rejected",
    tempPassword: invitation.tempPassword,
    token: invitation.token,
    expiresAt: invitation.expiresAt || new Date(),
    userId: invitation.userId || undefined,
    createdAt: invitation.createdAt || new Date(),
    acceptedAt: invitation.acceptedAt || undefined,
  };
}

/**
 * 초대 수락
 */
export async function acceptInvitation(
  token: string,
  userId: number
): Promise<BetaInvitation | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;

  // DB 업데이트
  await db
    .update(betaInvitations)
    .set({
      status: "accepted",
      userId,
      acceptedAt: new Date(),
    })
    .where(eq(betaInvitations.token, token));

  return {
    ...invitation,
    status: "accepted",
    userId,
    acceptedAt: new Date(),
  };
}

/**
 * 초대 거절
 */
export async function rejectInvitation(
  token: string
): Promise<BetaInvitation | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;

  // DB 업데이트
  await db
    .update(betaInvitations)
    .set({
      status: "rejected",
    })
    .where(eq(betaInvitations.token, token));

  return {
    ...invitation,
    status: "rejected",
  };
}

/**
 * 모든 초대 목록 조회
 */
export async function getAllInvitations(): Promise<BetaInvitation[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db.select().from(betaInvitations);

  return result.map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    status: inv.status as "pending" | "accepted" | "rejected",
    tempPassword: inv.tempPassword,
    token: inv.token,
    expiresAt: inv.expiresAt || new Date(),
    userId: inv.userId || undefined,
    createdAt: inv.createdAt || new Date(),
    acceptedAt: inv.acceptedAt || undefined,
  }));
}

/**
 * 초대 상태별 통계
 */
export async function getInvitationStats() {
  const invitations = await getAllInvitations();
  return {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === "pending").length,
    accepted: invitations.filter((inv) => inv.status === "accepted").length,
    rejected: invitations.filter((inv) => inv.status === "rejected").length,
  };
}

/**
 * 초대 이메일 템플릿
 */
export function getInvitationEmailTemplate(
  email: string,
  invitationToken: string,
  tempPassword: string,
  appUrl: string = "https://talkcaddy.com"
): { subject: string; html: string } {
  const acceptLink = `${appUrl}/beta/accept?token=${invitationToken}`;

  return {
    subject: "🎉 톡캐디 베타 테스트 초대",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">톡캐디 베타 테스트에 초대되었습니다! 🎉</h1>
        
        <p style="font-size: 16px; color: #666; line-height: 1.6;">
          안녕하세요! 톡캐디 팀입니다.<br/>
          당신을 톡캐디 베타 테스트 프로그램에 초대합니다.
        </p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📋 베타 테스트 계정 정보</h3>
          <p><strong>이메일:</strong> ${email}</p>
          <p><strong>임시 비밀번호:</strong> <code style="background-color: #eee; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          <p style="font-size: 12px; color: #999;">⚠️ 첫 로그인 후 비밀번호를 변경해주세요.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptLink}" style="display: inline-block; background-color: #FF6B6B; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            베타 테스트 시작하기
          </a>
        </div>

        <div style="background-color: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0066cc;">🎯 베타 테스트 기간</h4>
          <p style="margin: 0; color: #666;">2026년 1월 7일 ~ 1월 21일</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
          <p>문의사항이 있으신가요? <a href="mailto:beta@talkcaddy.com">beta@talkcaddy.com</a>으로 연락주세요.</p>
          <p>© 2026 Talk-Caddy. All rights reserved.</p>
        </div>
      </div>
    `,
  };
}
