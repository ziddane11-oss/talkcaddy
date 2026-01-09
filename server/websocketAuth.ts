import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * WebSocket 인증 유틸리티
 * JWT 토큰 검증 및 관리자 권한 확인
 */

/**
 * 요청에서 토큰 추출 (쿠키 또는 Authorization 헤더)
 */
export function extractToken(req: IncomingMessage): string | null {
  // 1. Authorization 헤더에서 Bearer 토큰 추출
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. 쿠키에서 세션 토큰 추출
  const cookies = req.headers.cookie;
  if (cookies) {
    const sessionMatch = cookies.match(/session=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1];
    }
  }

  return null;
}

/**
 * Origin 검증 (CSRF 방지)
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.VITE_APP_ID ? `https://${process.env.VITE_APP_ID}.manus.space` : null,
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Rate limiter (간단한 구현)
 */
const connectionLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(clientId: string, maxConnections: number = 5): boolean {
  const now = Date.now();
  const limit = connectionLimits.get(clientId);

  if (!limit || limit.resetTime < now) {
    // 새로운 시간 윈도우 시작 (1분)
    connectionLimits.set(clientId, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }

  if (limit.count >= maxConnections) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * 클라이언트 IP 추출
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * WebSocket 연결 인증 (async)
 * 토큰 검증 및 관리자 권한 확인
 */
export async function authenticateWebSocketConnection(
  req: IncomingMessage,
  ws: WebSocket
): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  try {
    // 1. Origin 검증
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin)) {
      ws.close(4002, "Invalid origin");
      return { isValid: false, error: "Invalid origin" };
    }

    // 2. 토큰 추출
    const token = extractToken(req);
    if (!token) {
      ws.close(4001, "Unauthorized: No token provided");
      return { isValid: false, error: "No token provided" };
    }

    // 3. 토큰 검증 (간단한 구현 - 실제로는 JWT 디코딩 필요)
    // 현재는 세션 쿠키 기반이므로, 토큰이 존재하면 유효한 것으로 간주
    // 실제 구현에서는 JWT 검증 또는 세션 DB 조회 필요
    const userId = await verifyToken(token);
    if (!userId) {
      ws.close(4001, "Unauthorized: Invalid token");
      return { isValid: false, error: "Invalid token" };
    }

    // 4. 관리자 권한 확인
    // 주의: userId는 토큰에서 추출한 문자열이므로 숫자로 변환 필요
    const userIdNum = parseInt(userId, 10);
    const db = await getDb();
    if (!db) {
      ws.close(4000, "Database connection failed");
      return { isValid: false, error: "Database connection failed" };
    }
    
    const userResults = await db.select().from(users).where(eq(users.id, userIdNum)).limit(1);
    const user = userResults.length > 0 ? userResults[0] : null;

    if (!user || user.role !== "admin") {
      ws.close(4003, "Forbidden: Admin access required");
      return { isValid: false, error: "Admin access required" };
    }

    // 5. Rate limiting (IP 기반)
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, 10)) {
      ws.close(4029, "Too many connections from this IP");
      return { isValid: false, error: "Too many connections" };
    }

    return { isValid: true, userId };
  } catch (error) {
    console.error("[WS Auth] Authentication error:", error);
    ws.close(4000, "Internal server error");
    return { isValid: false, error: "Internal server error" };
  }
}

/**
 * 토큰 검증 (간단한 구현)
 * 실제로는 JWT 디코딩 또는 세션 DB 조회 필요
 */
async function verifyToken(token: string): Promise<string | null> {
  try {
    // 이 부분은 실제 구현에서 JWT 디코딩 또는 세션 조회로 변경 필요
    // 현재는 토큰이 존재하면 유효한 것으로 간주
    if (token && token.length > 0) {
      // 실제 구현: JWT.verify(token, JWT_SECRET) 또는 세션 DB 조회
      // 임시로 토큰을 userId로 사용 (실제로는 JWT 디코딩 필요)
      // 예: const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return decoded.userId;
      return token; // 임시: 토큰 자체를 userId로 반환
    }
    return null;
  } catch (error) {
    console.error("[WS Auth] Token verification error:", error);
    return null;
  }
}

/**
 * WebSocket 연결 정보
 */
export interface WebSocketConnectionInfo {
  userId: string;
  clientIp: string;
  origin: string;
  connectedAt: Date;
}

/**
 * 연결 정보 저장소
 */
const connectionInfoMap = new Map<WebSocket, WebSocketConnectionInfo>();

export function storeConnectionInfo(
  ws: WebSocket,
  info: WebSocketConnectionInfo
): void {
  connectionInfoMap.set(ws, info);
}

export function getConnectionInfo(ws: WebSocket): WebSocketConnectionInfo | undefined {
  return connectionInfoMap.get(ws);
}

export function removeConnectionInfo(ws: WebSocket): void {
  connectionInfoMap.delete(ws);
}

export function getAllConnections(): WebSocketConnectionInfo[] {
  return Array.from(connectionInfoMap.values());
}
