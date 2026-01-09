import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import { errorLogs } from "../drizzle/schema";
import {
  authenticateWebSocketConnection,
  storeConnectionInfo,
  removeConnectionInfo,
  getConnectionInfo,
  WebSocketConnectionInfo,
  getClientIp,
} from "./websocketAuth";

/**
 * WebSocket 서버 - 실시간 에러 모니터링
 * 관리자 대시보드에 새 에러를 실시간으로 브로드캐스트
 * P0-1: 인증 및 권한 검증 추가
 * P2: 메시지 크기 제한, 배치 처리, cleanup 추가
 */

let wss: WebSocketServer | null = null;
const adminConnections = new Set<WebSocket>();

// 메시지 크기 제한 (1MB)
const MAX_MESSAGE_SIZE = 1024 * 1024;

// 배치 처리 설정
const BATCH_TIMEOUT_MS = 100; // 100ms 간격으로 배치 전송
let errorBatch: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * WebSocket 서버 초기화
 * P0-1: 인증 미들웨어 추가
 * P2: cleanup 타이머 추가
 */
export function initializeWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/errors" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    try {
      // P0-1: 인증 및 권한 검증
      const authResult = await authenticateWebSocketConnection(req, ws);
      if (!authResult.isValid || !authResult.userId) {
        console.log("[WS] Connection rejected:", authResult.error);
        return;
      }

      console.log("[WS] New authenticated admin connection:", authResult.userId);

      // 연결 정보 저장
      const connectionInfo: WebSocketConnectionInfo = {
        userId: authResult.userId,
        clientIp: getClientIp(req),
        origin: req.headers.origin || "unknown",
        connectedAt: new Date(),
      };
      storeConnectionInfo(ws, connectionInfo);
      adminConnections.add(ws);

      // 연결 확인 메시지
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Connected to error monitoring server",
          timestamp: new Date().toISOString(),
        })
      );

      // 메시지 수신
      ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data);
          console.log("[WS] Received message:", message);

          // 핑/퐁 메시지 처리
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error("[WS] Failed to parse message:", error);
        }
      });

      // 연결 종료
      ws.on("close", () => {
        const info = getConnectionInfo(ws);
        console.log("[WS] Admin connection closed:", info?.userId);
        adminConnections.delete(ws);
        removeConnectionInfo(ws);
      });

      // 에러 처리
      ws.on("error", (error) => {
        console.error("[WS] Connection error:", error);
        adminConnections.delete(ws);
        removeConnectionInfo(ws);
      });
    } catch (error) {
      console.error("[WS] Connection setup error:", error);
      ws.close(4000, "Internal server error");
    }
  });

  console.log("[WS] WebSocket server initialized on /ws/errors with authentication");
  return wss;
}

/**
 * 새 에러를 모든 연결된 관리자에게 브로드캐스트 (배치 처리)
 * P2: 메시지 크기 제한 및 배치 처리 추가
 */
export function broadcastNewError(errorData: {
  id: number;
  errorCode: string;
  errorMessage: string;
  location: string;
  severity: "info" | "warning" | "error" | "critical";
  createdAt: Date;
  statusCode?: number | null;
}) {
  if (!wss || adminConnections.size === 0) {
    console.log("[WS] No admin connections, skipping broadcast");
    return;
  }

  // 배치 처리: 에러를 일시적으로 모았다가 한 번에 전송
  errorBatch.push({
    ...errorData,
    createdAt: errorData.createdAt.toISOString(),
  });

  // 기존 타이머 취소
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  // 새 타이머 설정
  batchTimer = setTimeout(() => {
    if (errorBatch.length === 0) return;

    const batchMessage = JSON.stringify({
      type: "error_batch",
      data: errorBatch,
      timestamp: new Date().toISOString(),
    });

    // 메시지 크기 검증
    if (batchMessage.length > MAX_MESSAGE_SIZE) {
      console.warn("[WS] Batch message size exceeds limit, splitting");
      // 배치를 반으로 나누어 전송
      const half = Math.ceil(errorBatch.length / 2);
      const firstBatch = errorBatch.slice(0, half);
      const secondBatch = errorBatch.slice(half);

      sendBatchToConnections(firstBatch);
      sendBatchToConnections(secondBatch);
    } else {
      sendBatchToConnections(errorBatch);
    }

    errorBatch = [];
    batchTimer = null;
  }, BATCH_TIMEOUT_MS);
}

/**
 * 배치를 모든 연결에 전송
 */
function sendBatchToConnections(batch: any[]) {
  const batchMessage = JSON.stringify({
    type: "error_batch",
    data: batch,
    timestamp: new Date().toISOString(),
  });

  let successCount = 0;
  const deadConnections: WebSocket[] = [];

  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(batchMessage);
        successCount++;
      } catch (error) {
        console.error("[WS] Failed to send batch message:", error);
        deadConnections.push(ws);
      }
    } else if (ws.readyState === WebSocket.CLOSED) {
      deadConnections.push(ws);
    }
  });

  // P2: cleanup - 죽은 연결 제거
  deadConnections.forEach((ws) => {
    adminConnections.delete(ws);
    removeConnectionInfo(ws);
  });

  console.log(`[WS] Broadcasted ${batch.length} errors to ${successCount}/${adminConnections.size} connections`);
}

/**
 * 에러 통계 업데이트 브로드캐스트
 */
export function broadcastStatsUpdate(stats: {
  totalErrors: number;
  bySeverity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  resolved: number;
}) {
  if (!wss || adminConnections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: "stats_update",
    data: stats,
    timestamp: new Date().toISOString(),
  });

  let successCount = 0;
  const deadConnections: WebSocket[] = [];

  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        console.error("[WS] Failed to send stats update:", error);
        deadConnections.push(ws);
      }
    } else if (ws.readyState === WebSocket.CLOSED) {
      deadConnections.push(ws);
    }
  });

  // P2: cleanup - 죽은 연결 제거
  deadConnections.forEach((ws) => {
    adminConnections.delete(ws);
    removeConnectionInfo(ws);
  });
}

/**
 * 에러 해결 상태 업데이트 브로드캐스트
 */
export function broadcastErrorResolved(errorLogId: number) {
  if (!wss || adminConnections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: "error_resolved",
    data: {
      errorLogId,
    },
    timestamp: new Date().toISOString(),
  });

  let successCount = 0;
  const deadConnections: WebSocket[] = [];

  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        console.error("[WS] Failed to send error resolved message:", error);
        deadConnections.push(ws);
      }
    } else if (ws.readyState === WebSocket.CLOSED) {
      deadConnections.push(ws);
    }
  });

  // P2: cleanup - 죽은 연결 제거
  deadConnections.forEach((ws) => {
    adminConnections.delete(ws);
    removeConnectionInfo(ws);
  });
}

/**
 * WebSocket 서버 상태 조회
 */
export function getWebSocketStats() {
  return {
    connected: adminConnections.size,
    isRunning: wss !== null,
  };
}
