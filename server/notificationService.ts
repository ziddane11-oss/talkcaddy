import { getDb } from "./db";
import { errorNotificationQueue, errorLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 에러 자동 알림 서비스
 * - 심각도 높은 에러(critical/error) 발생 시 이메일/Slack 알림 전송
 */

interface NotificationConfig {
  adminEmail?: string;
  slackWebhookUrl?: string;
  slackChannel?: string;
}

const config: NotificationConfig = {
  adminEmail: process.env.ADMIN_EMAIL,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  slackChannel: process.env.SLACK_CHANNEL || "#errors",
};

/**
 * 에러 발생 시 자동 알림 큐에 추가
 */
export async function queueErrorNotification(
  errorLogId: number,
  severity: "info" | "warning" | "error" | "critical"
) {
  const db = await getDb();
  if (!db) return;

  // critical, error 심각도만 알림 전송
  if (!["critical", "error"].includes(severity)) {
    return;
  }

  try {
    // 이메일 알림 큐 추가
    if (config.adminEmail) {
      await db.insert(errorNotificationQueue).values({
        errorLogId,
        channel: "email",
        recipient: config.adminEmail,
        status: "pending",
      });
    }

    // Slack 알림 큐 추가
    if (config.slackWebhookUrl) {
      await db.insert(errorNotificationQueue).values({
        errorLogId,
        channel: "slack",
        recipient: config.slackChannel || "#errors",
        status: "pending",
      });
    }
  } catch (error) {
    console.error("Failed to queue error notification:", error);
  }
}

/**
 * 대기 중인 알림 전송
 */
export async function processNotificationQueue() {
  const db = await getDb();
  if (!db) return;

  try {
    // pending 상태의 알림 조회
    const pendingNotifications = await db
      .select()
      .from(errorNotificationQueue)
      .where(eq(errorNotificationQueue.status, "pending"))
      .limit(10);

    for (const notification of pendingNotifications) {
      try {
        if (notification.channel === "email") {
          await sendEmailNotification(notification.errorLogId, notification.recipient);
        } else if (notification.channel === "slack") {
          await sendSlackNotification(notification.errorLogId, notification.recipient);
        }

        // 알림 전송 완료 표시
        await db
          .update(errorNotificationQueue)
          .set({
            status: "sent",
            sentAt: new Date(),
          })
          .where(eq(errorNotificationQueue.id, notification.id));
      } catch (error) {
        // 재시도 횟수 증가
        const retryCount = (notification.retryCount || 0) + 1;
        const maxRetries = 3;

        if (retryCount >= maxRetries) {
          await db
            .update(errorNotificationQueue)
            .set({
              status: "failed",
              failureReason: (error as Error).message,
              retryCount,
            })
            .where(eq(errorNotificationQueue.id, notification.id));
        } else {
          await db
            .update(errorNotificationQueue)
            .set({
              retryCount,
            })
            .where(eq(errorNotificationQueue.id, notification.id));
        }
      }
    }
  } catch (error) {
    console.error("Failed to process notification queue:", error);
  }
}

/**
 * 이메일 알림 전송
 */
async function sendEmailNotification(errorLogId: number, recipient: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 에러 정보 조회
  const error = await db
    .select()
    .from(errorLogs)
    .where(eq(errorLogs.id, errorLogId))
    .limit(1);

  if (!error || error.length === 0) {
    throw new Error(`Error log not found: ${errorLogId}`);
  }

  const errorLog = error[0];

  // 이메일 본문 생성
  const emailBody = `
    <h2>🚨 에러 발생 알림</h2>
    <p><strong>심각도:</strong> ${errorLog.severity.toUpperCase()}</p>
    <p><strong>에러 코드:</strong> ${errorLog.errorCode}</p>
    <p><strong>메시지:</strong> ${errorLog.errorMessage}</p>
    <p><strong>위치:</strong> ${errorLog.location}</p>
    <p><strong>발생 시간:</strong> ${new Date(errorLog.createdAt).toLocaleString("ko-KR")}</p>
    <p><strong>상태 코드:</strong> ${errorLog.statusCode || "N/A"}</p>
    <hr />
    <p><a href="https://talkcaddy.manus.space/admin/errors?errorId=${errorLogId}">대시보드에서 보기</a></p>
  `;

  // 실제 이메일 전송 로직 (여기서는 로깅만 수행)
  console.log(`[EMAIL] Sending notification to ${recipient}:`, emailBody);

  // TODO: 실제 이메일 서비스 통합 (SendGrid, AWS SES 등)
}

/**
 * Slack 알림 전송
 */
async function sendSlackNotification(errorLogId: number, channel: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 에러 정보 조회
  const error = await db
    .select()
    .from(errorLogs)
    .where(eq(errorLogs.id, errorLogId))
    .limit(1);

  if (!error || error.length === 0) {
    throw new Error(`Error log not found: ${errorLogId}`);
  }

  const errorLog = error[0];

  // Slack 메시지 생성
  const slackMessage = {
    channel,
    attachments: [
      {
        color: errorLog.severity === "critical" ? "#FF0000" : "#FF6600",
        title: `🚨 ${errorLog.severity.toUpperCase()} - ${errorLog.errorCode}`,
        text: errorLog.errorMessage,
        fields: [
          {
            title: "위치",
            value: errorLog.location,
            short: true,
          },
          {
            title: "상태 코드",
            value: errorLog.statusCode?.toString() || "N/A",
            short: true,
          },
          {
            title: "발생 시간",
            value: new Date(errorLog.createdAt).toLocaleString("ko-KR"),
            short: false,
          },
        ],
        actions: [
          {
            type: "button",
            text: "대시보드에서 보기",
            url: `https://talkcaddy.manus.space/admin/errors?errorId=${errorLogId}`,
          },
        ],
      },
    ],
  };

  if (!config.slackWebhookUrl) {
    throw new Error("Slack webhook URL not configured");
  }

  // Slack 메시지 전송
  const response = await fetch(config.slackWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(slackMessage),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.statusText}`);
  }

  console.log(`[SLACK] Notification sent to ${channel}`);
}

/**
 * 정기적으로 알림 큐 처리 (예: 매분)
 */
export function startNotificationProcessor() {
  // 매 1분마다 알림 큐 처리
  setInterval(async () => {
    try {
      await processNotificationQueue();
    } catch (error) {
      console.error("Notification processor error:", error);
    }
  }, 60000); // 60초

  console.log("Notification processor started");
}
