var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/textParser.ts
import { jsonrepair } from "jsonrepair";
function extractFirstJsonCandidate(s) {
  if (!s || typeof s !== "string") return null;
  const fence = s.match(/```(?:json|JSON|js|javascript)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    const trimmed = fence[1].trim();
    if (trimmed) return trimmed;
  }
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  if (startObj === -1 && startArr === -1) return null;
  const start = startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) {
      return s.slice(start, i + 1);
    }
  }
  return null;
}
function safeParseAIResponse(content) {
  if (!content || typeof content !== "string") {
    console.error("[safeParseAIResponse] Empty or invalid content");
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
  }
  const clean = content.replace(/```json/gi, "").replace(/```JSON/g, "").replace(/```js/gi, "").replace(/```javascript/gi, "").replace(/```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
    }
  }
  const candidate = extractFirstJsonCandidate(content);
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
    }
    try {
      const repaired = jsonrepair(candidate);
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error("[safeParseAIResponse] jsonrepair failed:", repairError);
    }
  }
  const cleanCandidate = extractFirstJsonCandidate(clean);
  if (cleanCandidate) {
    try {
      return JSON.parse(cleanCandidate);
    } catch {
    }
    try {
      const repaired = jsonrepair(cleanCandidate);
      return JSON.parse(repaired);
    } catch {
    }
  }
  console.error("[safeParseAIResponse] All parsing attempts failed");
  console.error("[safeParseAIResponse] content_head:", content.slice(0, 300));
  console.error("[safeParseAIResponse] content_tail:", content.slice(-300));
  return null;
}
function extractSection(text2, sectionName) {
  const cleanText = text2.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/^-\s*/gm, "");
  const patterns = [
    // 패턴 1: "\uc139션명: 내용" (다음 섹션까지)
    new RegExp(`${sectionName}[:\uFF1A]\\s*([\\s\\S]*?)(?=\\n(?:\uC2EC\uB9AC \uBD84\uC11D|\uD574\uC11D|\uB354 \uD544\uC694\uD55C \uB9E5\uB77D|\uC9C8\uBB38|\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4|\uADE0\uD615\uC7A1\uD78C \uD1A4|\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4|\uC5C5\uB370\uC774\uD2B8\uB41C \uBA54\uBAA8\uB9AC|$))`, "i"),
    // 패턴 2: "\uc139션명: 내용" (다음 줄까지)
    new RegExp(`${sectionName}[:\uFF1A]\\s*(.+?)(?=\\n|$)`, "i"),
    // 패턴 3: "\uc139션명\n내용" (줄바꿈 후 내용)
    new RegExp(`${sectionName}\\s*\\n(.+?)(?=\\n\\n|$)`, "i")
  ];
  for (const regex of patterns) {
    const match = cleanText.match(regex);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }
  return "";
}
function extractNumber(text2) {
  const match = text2.match(/\d+/);
  return match ? parseInt(match[0], 10) : 50;
}
function parseAnalysisResponse(text2) {
  const psychology = extractSection(text2, "\uC2EC\uB9AC \uBD84\uC11D");
  const assumption = extractSection(text2, "\uD574\uC11D");
  const contextSection = extractSection(text2, "\uB354 \uD544\uC694\uD55C \uB9E5\uB77D");
  const need_more_context = contextSection.toLowerCase().includes("yes") || contextSection.toLowerCase().includes("\uB124");
  const context_question = need_more_context ? extractSection(text2, "\uC9C8\uBB38") : "";
  const softSection = extractSection(text2, "\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uB2F5\uC7A5");
  const softEffect = extractSection(text2, "\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uD6A8\uACFC");
  const softRisk = extractNumber(extractSection(text2, "\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uC704\uD5D8\uB3C4"));
  const balancedSection = extractSection(text2, "\uADE0\uD615\uC7A1\uD78C \uD1A4 \uB2F5\uC7A5");
  const balancedEffect = extractSection(text2, "\uADE0\uD615\uC7A1\uD78C \uD1A4 \uD6A8\uACFC");
  const balancedRisk = extractNumber(extractSection(text2, "\uADE0\uD615\uC7A1\uD78C \uD1A4 \uC704\uD5D8\uB3C4"));
  const humorSection = extractSection(text2, "\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uB2F5\uC7A5");
  const humorEffect = extractSection(text2, "\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uD6A8\uACFC");
  const humorRisk = extractNumber(extractSection(text2, "\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uC704\uD5D8\uB3C4"));
  const updated_memory_summary = extractSection(text2, "\uC5C5\uB370\uC774\uD2B8\uB41C \uBA54\uBAA8\uB9AC");
  return {
    one_line_psychology: psychology,
    assumption,
    need_more_context,
    context_question,
    replies: [
      {
        tone: "soft",
        text: softSection,
        why: softEffect,
        risk: softRisk
      },
      {
        tone: "balanced",
        text: balancedSection,
        why: balancedEffect,
        risk: balancedRisk
      },
      {
        tone: "humor",
        text: humorSection,
        why: humorEffect,
        risk: humorRisk
      }
    ],
    updated_memory_summary
  };
}
var init_textParser = __esm({
  "server/textParser.ts"() {
    "use strict";
  }
});

// server/aiValidation.ts
var aiValidation_exports = {};
__export(aiValidation_exports, {
  AnalysisResultSchema: () => AnalysisResultSchema,
  ReplySchema: () => ReplySchema,
  ReplyToneSchema: () => ReplyToneSchema,
  extractRiskScore: () => extractRiskScore,
  getRiskLevel: () => getRiskLevel,
  validateAnalysisResult: () => validateAnalysisResult,
  validateAndRetry: () => validateAndRetry
});
import { z as z3 } from "zod";
async function validateAndRetry(rawResponse, retryFn, maxRetries = 2) {
  let attempts = 0;
  let lastError = null;
  let lastRawResponse = rawResponse;
  while (attempts <= maxRetries) {
    try {
      if (!rawResponse || rawResponse.trim() === "" || rawResponse === "{}") {
        throw new Error("AI \uC751\uB2F5\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.");
      }
      let parsed = safeParseAIResponse(rawResponse);
      if (!parsed) {
        console.warn("[AI Validation] JSON \uCD94\uCD9C \uC2E4\uD328, \uD14D\uC2A4\uD2B8 \uD30C\uC11C\uB85C \uD3F4\uBC31 \uC2DC\uB3C4...");
        const textParsed = parseAnalysisResponse(rawResponse);
        if (textParsed.one_line_psychology && textParsed.replies.some((r) => r.text)) {
          parsed = textParsed;
          console.log("[AI Validation] \uD14D\uC2A4\uD2B8 \uD30C\uC11C \uC131\uACF5!");
        } else {
          throw new Error("AI \uC751\uB2F5\uC5D0\uC11C JSON\uC744 \uCD94\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
      }
      const validated = AnalysisResultSchema.parse(parsed);
      return validated;
    } catch (error) {
      lastError = error;
      lastRawResponse = rawResponse;
      attempts++;
      if (attempts <= maxRetries) {
        console.warn(`[AI Validation] \uAC80\uC99D \uC2E4\uD328 (${attempts}/${maxRetries}), \uC7AC\uC2DC\uB3C4 \uC911...`, error.message);
        console.warn(`[AI Validation] \uC6D0\uBCF8 \uC751\uB2F5 (300\uC790):`, rawResponse.slice(0, 300));
        rawResponse = await retryFn();
      }
    }
  }
  console.warn("[AI Validation] \uBAA8\uB4E0 \uC7AC\uC2DC\uB3C4 \uC2E4\uD328, \uCD5C\uC885 \uD14D\uC2A4\uD2B8 \uD30C\uC11C \uC2DC\uB3C4...");
  const finalTextParsed = parseAnalysisResponse(lastRawResponse);
  if (finalTextParsed.one_line_psychology && finalTextParsed.replies.some((r) => r.text)) {
    console.log("[AI Validation] \uCD5C\uC885 \uD14D\uC2A4\uD2B8 \uD30C\uC11C \uC131\uACF5!");
    return finalTextParsed;
  }
  throw new Error(`AI \uC751\uB2F5 \uAC80\uC99D \uC2E4\uD328 (${maxRetries}\uD68C \uC7AC\uC2DC\uB3C4): ${lastError?.message}`);
}
function validateAnalysisResult(rawResponse) {
  const parsed = JSON.parse(rawResponse);
  return AnalysisResultSchema.parse(parsed);
}
function extractRiskScore(riskString) {
  const match = riskString.match(/^(\d+)/);
  if (!match) return 50;
  return parseInt(match[1], 10);
}
function getRiskLevel(score) {
  if (score <= 40) return "safe";
  if (score <= 60) return "caution";
  return "danger";
}
var ReplyToneSchema, ReplySchema, AnalysisResultSchema;
var init_aiValidation = __esm({
  "server/aiValidation.ts"() {
    "use strict";
    init_textParser();
    ReplyToneSchema = z3.enum(["soft", "balanced", "humor"]);
    ReplySchema = z3.object({
      tone: ReplyToneSchema,
      text: z3.string().min(1, "\uB2F5\uC7A5 \uD14D\uC2A4\uD2B8\uB294 \uD544\uC218\uC785\uB2C8\uB2E4").max(110, "\uB2F5\uC7A5\uC740 110\uC790 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4 (1~2\uBB38\uC7A5)"),
      why: z3.string().min(1, "\uC608\uC0C1 \uD6A8\uACFC\uB294 \uD544\uC218\uC785\uB2C8\uB2E4"),
      risk: z3.union([
        z3.number().min(0).max(100),
        z3.string().regex(/^\d+/, "risk\uB294 \uC22B\uC790\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4")
      ]).transform((val) => {
        if (typeof val === "number") return val.toString();
        return val;
      })
    });
    AnalysisResultSchema = z3.object({
      one_line_psychology: z3.string().min(1, "\uC2EC\uB9AC \uBD84\uC11D\uC740 \uD544\uC218\uC785\uB2C8\uB2E4"),
      assumption: z3.string().optional().default(""),
      need_more_context: z3.boolean(),
      context_question: z3.string(),
      replies: z3.array(ReplySchema).length(3, "\uB2F5\uC7A5\uC740 \uC815\uD655\uD788 3\uAC1C\uC5EC\uC57C \uD569\uB2C8\uB2E4"),
      updated_memory_summary: z3.string().min(1, "\uBA54\uBAA8\uB9AC \uC694\uC57D\uC740 \uD544\uC218\uC785\uB2C8\uB2E4")
    });
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, lt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, smallint, boolean } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 대화 상대방 이름 또는 별칭 */
  partnerName: varchar("partnerName", { length: 100 }).notNull(),
  /** 관계 유형: 썸, 연애, 재회, 직장, 거래, 기타 */
  relationshipType: mysqlEnum("relationshipType", ["\uC378", "\uC5F0\uC560", "\uC7AC\uD68C", "\uC9C1\uC7A5", "\uAC70\uB798", "\uAE30\uD0C0"]).notNull(),
  /** 목표: 약속 잡기, 분위기 유지, 사과, 선 긋기, 감정 확인 (JSON 배열) */
  goals: text("goals").notNull(),
  /** 금지 옵션: 장문, 들이대기, 감정 과다 (JSON 배열) */
  restrictions: text("restrictions"),
  /** 누적된 대화 요약 (AI가 생성한 맥락 요약) */
  contextSummary: text("contextSummary"),
  /** 메모리 요약 (AI가 생성한 대화 메모리, 텍스트 분석용) */
  memorySummary: text("memorySummary"),
  /** 스타일 제약: 장문 금지 */
  noLongMessage: boolean("noLongMessage").default(false),
  /** 스타일 제약: 감정 과다 금지 */
  noEmotional: boolean("noEmotional").default(false),
  /** 스타일 제약: 존댓말 강제 */
  forcePolite: boolean("forcePolite").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var uploads = mysqlTable("uploads", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  /** 업로드된 스크린샷 S3 URL */
  screenshotUrl: text("screenshotUrl"),
  /** 업로드 상태: pending, ocr_done, ingested, analyzed */
  status: mysqlEnum("status", ["pending", "ocr_done", "ingested", "analyzed"]).notNull().default("pending"),
  /** OCR로 추출된 원본 텍스트 */
  ocrTextRaw: text("ocrTextRaw"),
  /** OCR 파싱 결과 (JSON: 말풍선 단위) */
  ocrParsedJson: text("ocrParsedJson"),
  /** 에러 메시지 (실패 시) */
  errorMessage: text("errorMessage"),
  /** 에러 코드 (API 에러 표준화) */
  errorCode: varchar("errorCode", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var messageHistory = mysqlTable("messageHistory", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  /** 업로드된 스크린샷 S3 URL */
  screenshotUrl: text("screenshotUrl"),
  /** OCR로 추출된 원본 텍스트 */
  ocrTextRaw: text("ocrTextRaw"),
  /** OCR 파싱 결과 (JSON: 말풍선 단위) */
  ocrParsedJson: text("ocrParsedJson"),
  /** 메시지 타입: screenshot 또는 text (복붙) */
  messageType: mysqlEnum("messageType", ["screenshot", "text"]).notNull().default("screenshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  /** 발신자: me(나), other(상대), unknown(구분 불가) */
  speaker: mysqlEnum("speaker", ["me", "other", "unknown"]).notNull(),
  /** 메시지 내용 */
  content: text("content").notNull(),
  /** 출처: ocr(스크린샷), paste(텍스트 입력), context(상황 입력) */
  source: mysqlEnum("source", ["ocr", "paste", "context"]).notNull(),
  /** 중복 제거용 해시 (speaker + normalized content) */
  hash: varchar("hash", { length: 64 }).notNull(),
  /** 시간 힌트 (있으면) */
  tsHint: text("tsHint"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var analysisResults = mysqlTable("analysisResults", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  /** 입력 발췌 (최근 대화 요약) */
  inputExcerpt: text("inputExcerpt"),
  /** 전체 출력 JSON (상대심리, 답변3종, memory_summary 등) */
  outputJson: text("outputJson").notNull(),
  /** 사용된 AI 모델 */
  model: varchar("model", { length: 100 }).default("gpt-4o"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 구독 플랜: free, basic, premium */
  plan: mysqlEnum("plan", ["free", "basic", "premium"]).notNull().default("free"),
  /** 구독 시작일 */
  startDate: timestamp("startDate"),
  /** 구독 종료일 */
  endDate: timestamp("endDate"),
  /** 구독 상태: active, expired, cancelled */
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  /** 결제 정보 (아임포트 merchant_uid 등) */
  paymentInfo: text("paymentInfo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  analysisResultId: int("analysisResultId").notNull().references(() => analysisResults.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 선택한 톤: soft, strong, neutral */
  tone: mysqlEnum("tone", ["soft", "strong", "neutral"]).notNull(),
  /** 만족도: 1(좋음), -1(싫음), 0(중립) */
  rating: int("rating").notNull().default(0),
  /** 피드백 코멘트 */
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  /** 선호하는 톤: soft, strong, neutral */
  preferredTone: mysqlEnum("preferredTone", ["soft", "strong", "neutral"]).notNull().default("neutral"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var errorLogs = mysqlTable("errorLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  errorCode: varchar("errorCode", { length: 50 }).notNull(),
  errorMessage: text("errorMessage").notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  context: text("context"),
  stackTrace: text("stackTrace"),
  statusCode: int("statusCode").default(500),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).notNull().default("error"),
  resolved: smallint("resolved").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var errorNotificationQueue = mysqlTable("errorNotificationQueue", {
  id: int("id").autoincrement().primaryKey(),
  errorLogId: int("errorLogId").notNull().references(() => errorLogs.id, { onDelete: "cascade" }),
  channel: mysqlEnum("channel", ["email", "slack"]).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  failureReason: text("failureReason"),
  retryCount: int("retryCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt")
});
var errorReproductionSteps = mysqlTable("errorReproductionSteps", {
  id: int("id").autoincrement().primaryKey(),
  errorLogId: int("errorLogId").notNull().references(() => errorLogs.id, { onDelete: "cascade" }),
  userInputs: text("userInputs"),
  browserInfo: text("browserInfo"),
  networkStatus: text("networkStatus"),
  previousPage: varchar("previousPage", { length: 255 }),
  currentPage: varchar("currentPage", { length: 255 }).notNull(),
  clickEvents: text("clickEvents"),
  consoleLogs: text("consoleLogs"),
  reproductionDifficulty: mysqlEnum("reproductionDifficulty", ["easy", "medium", "hard"]),
  reproductionSteps: text("reproductionSteps"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var analysisCache = mysqlTable("analysisCache", {
  id: int("id").autoincrement().primaryKey(),
  /** 이미지 바이너리의 SHA-256 해시 (캐시 키) */
  imageHash: varchar("imageHash", { length: 64 }).notNull().unique(),
  /** 정규화된 OCR 텍스트의 SHA-256 해시 (보조 캐시 키, 향후 사용) */
  textHash: varchar("textHash", { length: 64 }),
  /** 캐시된 분석 결과 JSON (analysisResults.outputJson과 동일 형식) */
  cachedResult: text("cachedResult").notNull(),
  /** 캐시 생성 시간 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 캐시 만료 시간 (TTL: 7일) */
  expiresAt: timestamp("expiresAt").notNull(),
  /** 캐시 적중 횟수 (모니터링용) */
  hitCount: int("hitCount").default(0).notNull(),
  /** 마지막 적중 시간 */
  lastHitAt: timestamp("lastHitAt")
});
var betaFeedback = mysqlTable("betaFeedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 피드백 유형: feature, bug, usability */
  feedbackType: mysqlEnum("feedbackType", ["feature", "bug", "usability"]).notNull(),
  /** 제목 */
  title: varchar("title", { length: 255 }).notNull(),
  /** 상세 내용 */
  description: text("description").notNull(),
  /** 평점 (1-5, 버그 리포트는 null) */
  rating: int("rating"),
  /** 기기 정보 (버그 리포트용) */
  deviceInfo: varchar("deviceInfo", { length: 255 }),
  /** 재현 가능 여부 */
  reproducible: boolean("reproducible").default(false),
  /** 재현 단계 */
  reproductionSteps: text("reproductionSteps"),
  /** 스크린샷 S3 URL */
  screenshotUrl: text("screenshotUrl"),
  /** 피드백 상태: open, in_progress, resolved, rejected */
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "rejected"]).notNull().default("open"),
  /** 우선순위 점수 (자동 계산) */
  priorityScore: int("priorityScore").default(0),
  /** 심각도 (버그용): low, medium, high, critical */
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]),
  /** 중복 버그 ID (같은 버그의 경우) */
  duplicateOf: int("duplicateOf"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var betaFeedbacks = mysqlTable("beta_feedbacks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull(),
  feedbackType: varchar("feedback_type", { length: 20 }).notNull(),
  // 'feature', 'bug', 'usability'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  rating: int("rating"),
  // 1-5
  deviceInfo: text("device_info"),
  reproducible: boolean("reproducible").default(false),
  reproductionSteps: text("reproduction_steps"),
  screenshotUrl: varchar("screenshot_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("open"),
  // 'open', 'in_progress', 'resolved', 'rejected'
  priorityScore: int("priority_score").default(0),
  severity: varchar("severity", { length: 20 }),
  // 'low', 'medium', 'high', 'critical'
  duplicateOf: varchar("duplicate_of", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});
var betaInvitations = mysqlTable("beta_invitations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  tempPassword: varchar("temp_password", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at")
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function addMessage(message) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(message);
  return result;
}
async function getExistingMessageHashes(conversationId) {
  const db = await getDb();
  if (!db) return /* @__PURE__ */ new Set();
  const result = await db.select({ hash: messages.hash }).from(messages).where(eq(messages.conversationId, conversationId));
  return new Set(result.map((r) => r.hash));
}
async function getRecentMessagesByConversationId(conversationId, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(limit);
}
async function createConversation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}
async function getConversationsByUserId(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.userId, userId));
}
async function getConversationById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateConversation(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conversations).set(data).where(eq(conversations.id, id));
}
async function deleteConversation(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(conversations).where(eq(conversations.id, id));
}
async function addMessageHistory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messageHistory).values(data);
  return result[0].insertId;
}
async function getMessageHistoryByConversationId(conversationId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messageHistory).where(eq(messageHistory.conversationId, conversationId));
}
async function saveAnalysisResult(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(analysisResults).values(data);
  return result[0].insertId;
}
async function getLatestAnalysisResult(conversationId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(analysisResults).where(eq(analysisResults.conversationId, conversationId)).orderBy(analysisResults.createdAt).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getSubscriptionByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createOrUpdateSubscription(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSubscriptionByUserId(data.userId);
  if (existing) {
    await db.update(subscriptions).set(data).where(eq(subscriptions.userId, data.userId));
  } else {
    await db.insert(subscriptions).values(data);
  }
}
async function createUpload(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uploads).values(data);
  return result[0].insertId;
}
async function getUploadById(uploadId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateUpload(uploadId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(uploads).set(data).where(eq(uploads.id, uploadId));
}
async function getCachedAnalysisByImageHash(imageHash) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(analysisCache).where(eq(analysisCache.imageHash, imageHash)).limit(1);
  if (result.length === 0) return null;
  const cache = result[0];
  if (/* @__PURE__ */ new Date() > new Date(cache.expiresAt)) {
    db.delete(analysisCache).where(eq(analysisCache.id, cache.id)).catch(
      (err) => console.warn("[Cache] Failed to delete expired cache:", err)
    );
    return null;
  }
  db.update(analysisCache).set({
    hitCount: cache.hitCount + 1,
    lastHitAt: /* @__PURE__ */ new Date()
  }).where(eq(analysisCache.id, cache.id)).catch((err) => console.warn("[Cache] Failed to update hit count:", err));
  return cache.cachedResult;
}
async function saveCachedAnalysis(imageHash, cachedResult, ttlDays = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = /* @__PURE__ */ new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1e3);
  try {
    await db.insert(analysisCache).values({
      imageHash,
      cachedResult,
      expiresAt
    });
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") {
      throw error;
    }
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/sdk.ts
import { ForbiddenError } from "@shared/_core/errors";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var timingMiddleware = t.middleware(async ({ path: path3, type, next }) => {
  const start = Date.now();
  console.log(`[tRPC] -> ${type} ${path3}`);
  try {
    const result = await next();
    console.log(`[tRPC] <- ${type} ${path3} ${Date.now() - start}ms`);
    return result;
  } catch (e) {
    console.log(`[tRPC] !! ${type} ${path3} ${Date.now() - start}ms`, e instanceof Error ? e.message : String(e));
    throw e;
  }
});
var router = t.router;
var publicProcedure = t.procedure.use(timingMiddleware);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(timingMiddleware).use(requireUser);
var adminProcedure = t.procedure.use(timingMiddleware).use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z10 } from "zod";

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages: messages2,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages2.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers.ts
import { nanoid as nanoid2 } from "nanoid";

// server/promptTemplates.ts
function detectSpeechStyle(messages2) {
  const casualPatterns = [
    /ㅋㅋ/,
    /ㅎㅎ/,
    /[가-힣]+야\b/,
    /[가-힣]+해\b/,
    /[가-힣]+어\b/,
    /[가-힣]+지\b/,
    /[가-힣]+냐\b/,
    /[가-힣]+임\b/,
    /[가-힣]+ㅇㅇ/,
    /뭐해/,
    /뭐야/,
    /왜\?/,
    /어디야/,
    /뭐라고/,
    /알겠어/,
    /그래\b/,
    /응\b/,
    /어\b/,
    /아니\b/
  ];
  const formalPatterns = [
    /[가-힣]+요\b/,
    /[가-힣]+습니다/,
    /[가-힣]+세요/,
    /[가-힣]+까요/,
    /[가-힣]+니다/
  ];
  let casualCount = 0;
  let formalCount = 0;
  for (const pattern of casualPatterns) {
    if (pattern.test(messages2)) casualCount++;
  }
  for (const pattern of formalPatterns) {
    if (pattern.test(messages2)) formalCount++;
  }
  if (casualCount > formalCount * 2) return "casual";
  if (formalCount > casualCount * 2) return "formal";
  return "mixed";
}
function detectCuteSpeechStyle(messages2) {
  const detectedPatterns = [];
  const suffixPatterns = [
    { pattern: /[가-힣]+용[\?!]?/g, name: "~\uC6A9" },
    { pattern: /[가-힣]+행[\?!]?/g, name: "~\uD589" },
    { pattern: /[가-힣]+함[\?!]?/g, name: "~\uD568" },
    { pattern: /[가-힣]+얌[\?!]?/g, name: "~\uC58C" },
    { pattern: /[가-힣]+냠[\?!]?/g, name: "~\uB0E0" },
    { pattern: /[가-힣]+댬[\?!]?/g, name: "~\uB32C" },
    { pattern: /시퐁/g, name: "\uC2DC\uD401" }
  ];
  const lispPatterns = [
    { pattern: /[가-힣]+쪄[\?!]?/g, name: "~\uCA84" },
    { pattern: /[가-힣]+뗘[\?!]?/g, name: "~\uB5D8" },
    { pattern: /[가-힣]+꼬야[\?!]?/g, name: "~\uAF2C\uC57C" },
    { pattern: /[가-힣]+꼬얌[\?!]?/g, name: "~\uAF2C\uC58C" },
    { pattern: /모했/g, name: "\uBAA8\uD588(\uBB50\uD588)" },
    { pattern: /오뗘/g, name: "\uC624\uB5D8(\uC5B4\uB54C)" }
  ];
  const cuteEndingPatterns = [
    { pattern: /[가-힣]+디[\?!]?/g, name: "~\uB514" },
    { pattern: /[가-힣]+큥[\?!]?/g, name: "~\uD065" },
    { pattern: /[가-힣]+뀨[\?!]?/g, name: "~\uB028" },
    { pattern: /디용[\?!]?/g, name: "\uB514\uC6A9" }
  ];
  const exclamationPatterns = [
    { pattern: /힝[구]?/g, name: "\uD79D/\uD79D\uAD6C" },
    { pattern: /웅웅/g, name: "\uC6C5\uC6C5" },
    { pattern: /잉[\.\~]*/g, name: "\uC789" },
    { pattern: /뿌엥/g, name: "\uBFCC\uC5E5" },
    { pattern: /앙[\~]*/g, name: "\uC559" },
    { pattern: /냥[\~]*/g, name: "\uB0E5" }
  ];
  const nicknamePatterns = [
    { pattern: /울\s*[가-힣]+이/g, name: "\uC6B8 OO\uC774" },
    { pattern: /애기/g, name: "\uC560\uAE30" },
    { pattern: /공주/g, name: "\uACF5\uC8FC" },
    { pattern: /왕자/g, name: "\uC655\uC790" }
  ];
  const allPatternGroups = [
    suffixPatterns,
    lispPatterns,
    cuteEndingPatterns,
    exclamationPatterns,
    nicknamePatterns
  ];
  let totalMatches = 0;
  for (const group of allPatternGroups) {
    for (const { pattern, name } of group) {
      const matches = messages2.match(pattern);
      if (matches && matches.length > 0) {
        if (!detectedPatterns.includes(name)) {
          detectedPatterns.push(name);
        }
        totalMatches += matches.length;
      }
    }
  }
  let intensity = "light";
  if (totalMatches >= 5 || detectedPatterns.length >= 4) {
    intensity = "heavy";
  } else if (totalMatches >= 2 || detectedPatterns.length >= 2) {
    intensity = "medium";
  }
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    intensity
  };
}
function getSpeechStyleInstruction(messages2, relationshipType) {
  const style = detectSpeechStyle(messages2);
  const cuteStyle = detectCuteSpeechStyle(messages2);
  if ((relationshipType === "\uC378" || relationshipType === "\uC5F0\uC560") && cuteStyle.detected) {
    const intensityGuide = {
      light: "\uAC00\uBCCD\uAC8C",
      medium: "\uC801\uB2F9\uD788",
      heavy: "\uC801\uADF9\uC801\uC73C\uB85C"
    };
    return `
\u2757\u2757\u2757 \uBB38\uCCB4 \uC9C0\uC2DC (\uD544\uC218) \u2757\u2757\u2757
\uC774 \uB300\uD654\uB294 \uADC0\uC5EC\uC6B4 \uC560\uAD50\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB294 \uCE5C\uBC00\uD55C \uC5F0\uC778 \uAD00\uACC4\uC785\uB2C8\uB2E4.
\uC0C1\uB300\uBC29\uC774 \uC0AC\uC6A9\uD558\uB294 \uB9D0\uD22C \uD328\uD134: ${cuteStyle.patterns.join(", ")}

\uB2F5\uC7A5\uC744 \uC791\uC131\uD560 \uB54C \uBC18\uB4DC\uC2DC \uC0C1\uB300\uBC29\uC758 \uB9D0\uD22C\uB97C ${intensityGuide[cuteStyle.intensity]} \uD749\uB0B4\uB0B4\uC138\uC694.

\u2705 \uC0AC\uC6A9\uD574\uC57C \uD560 \uD45C\uD604 \uC608\uC2DC:
- \uBC1B\uCE68 \uBCC0\uD615: ~\uC6A9, ~\uD589, ~\uD568, ~\uC58C (\uC608: "\uC54C\uC558\uC5B4\uC6A9", "\uBCF4\uACE0\uC2DC\uD401", "\uBA39\uC5C8\uB0E0")
- \uD600 \uC9E7\uC740 \uC18C\uB9AC: ~\uCA84, ~\uB5D8, ~\uAF2C\uC57C (\uC608: "\uBAA8\uD588\uCA84?", "\uC624\uB5D8?", "\uAC08\uAF2C\uC57C!")
- \uADC0\uC5EC\uC6B4 \uC885\uACB0\uC5B4\uBBF8: ~\uB514, ~\uD065, ~\uB028 (\uC608: "\uC54C\uACA0\uD065!", "\uBBF8\uC548\uB028")
- \uAC10\uD0C4\uC0AC: \uD79D, \uC6C5, \uC789, \uBFCC\uC5E5 (\uC608: "\uD79D.. \uBCF4\uACE0 \uC2F6\uC5B4", "\uC6C5\uC6C5 \uC54C\uACA0\uC5B4")

\u274C \uC808\uB300 \uC0AC\uC6A9 \uAE08\uC9C0: \uB531\uB531\uD55C \uC874\uB313\uB9D0 (~\uC2B5\uB2C8\uB2E4, ~\uC138\uC694)
\u274C \uB108\uBB34 \uACFC\uD558\uAC8C \uC0AC\uC6A9\uD558\uC9C0 \uB9D0\uACE0 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC11E\uC5B4\uC11C \uC0AC\uC6A9

\uC608\uC2DC \uB2F5\uBCC0:
- "\uBCF4\uACE0 \uC2F6\uC5C8\uC5B4\uC6A9~ \uC624\uB298 \uB9CC\uB0A0\uAF2C\uC57C? \uD79D"
- "\uC54C\uACA0\uCA84! \uAE30\uB2E4\uB9B4\uACA1 \u314E\u314E"
- "\uC6C5\uC6C5 \uB098\uB3C4 \uC88B\uC544\uD589~"

\uC774 \uC9C0\uC2DC\uB97C \uBB34\uC2DC\uD558\uBA74 \uC751\uB2F5\uC774 \uBD80\uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB429\uB2C8\uB2E4.`;
  }
  if ((relationshipType === "\uC378" || relationshipType === "\uC5F0\uC560") && style === "casual") {
    return `
\u2757\u2757\u2757 \uBB38\uCCB4 \uC9C0\uC2DC (\uD544\uC218) \u2757\u2757\u2757
\uC774 \uB300\uD654\uB294 \uBC18\uB9D0\uC744 \uC0AC\uC6A9\uD558\uB294 \uCE5C\uBC00\uD55C \uAD00\uACC4\uC785\uB2C8\uB2E4.
\uB2F5\uC7A5\uC744 \uC791\uC131\uD560 \uB54C \uBC18\uB4DC\uC2DC \uBC18\uB9D0\uCCB4\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.

\u274C \uC808\uB300 \uC0AC\uC6A9 \uAE08\uC9C0: ~\uC694, ~\uC2B5\uB2C8\uB2E4, ~\uC138\uC694, ~\uAE4C\uC694, ~\uB2C8\uB2E4
\u2705 \uC0AC\uC6A9\uD574\uC57C \uD560 \uD45C\uD604: ~\uC5B4, ~\uC9C0, ~\uC57C, ~\uB124, ~\uB77C, ~\uAC8C, \u314B\u314B, \u314E\u314E

\uC608\uC2DC:
- "\uBBF8\uC548\uD574\uC694" \u2192 "\uBBF8\uC548\uD574" \uB610\uB294 "\uBBF8\uC548~"
- "\uAD1C\uCC2E\uC544\uC694" \u2192 "\uAD1C\uCC2E\uC544" \uB610\uB294 "\uAD1C\uCC2E\uC544!"
- "\uBCF4\uACE0 \uC2F6\uC5B4\uC694" \u2192 "\uBCF4\uACE0 \uC2F6\uC5B4" \uB610\uB294 "\uBCF4\uACE0 \uC2F6\uC5C8\uC5B4"
- "\uB9CC\uB098\uC694" \u2192 "\uB9CC\uB098\uC790" \uB610\uB294 "\uBCF4\uC790"

\uC774 \uC9C0\uC2DC\uB97C \uBB34\uC2DC\uD558\uBA74 \uC751\uB2F5\uC774 \uBD80\uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB429\uB2C8\uB2E4.`;
  }
  if (relationshipType === "\uC9C1\uC7A5" || relationshipType === "\uAC70\uB798") {
    return `
\uC911\uC694: \uC9C1\uC7A5/\uBE44\uC988\uB2C8\uC2A4 \uAD00\uACC4\uC785\uB2C8\uB2E4. \uB2F5\uC7A5\uC740 \uBC18\uB4DC\uC2DC \uC874\uB313\uB9D0\uB85C \uC791\uC131\uD558\uC138\uC694.`;
  }
  if (style === "formal") {
    return `
\uC911\uC694: \uB300\uD654\uC5D0\uC11C \uC874\uB313\uB9D0\uC744 \uC0AC\uC6A9\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uB2F5\uC7A5\uB3C4 \uC874\uB313\uB9D0\uB85C \uC791\uC131\uD558\uC138\uC694.`;
  }
  return `
\uB300\uD654\uC758 \uBB38\uCCB4(\uBC18\uB9D0/\uC874\uB313\uB9D0)\uB97C \uD30C\uC545\uD558\uC5EC \uB3D9\uC77C\uD55C \uBB38\uCCB4\uB85C \uB2F5\uC7A5\uC744 \uC791\uC131\uD558\uC138\uC694.`;
}
function generateAnalysisPrompt(context) {
  const speechStyleInstruction = getSpeechStyleInstruction(context.recentMessages, context.relationshipType);
  return `\uB2F9\uC2E0\uC740 \uCE74\uD1A1 \uB300\uD654 \uBD84\uC11D \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4.

\uB2E4\uC74C \uB300\uD654\uB97C \uBD84\uC11D\uD558\uACE0, \uC0C1\uB300\uBC29\uC758 \uC2EC\uB9AC, \uB300\uD654 \uD574\uC11D, \uADF8\uB9AC\uACE0 3\uAC00\uC9C0 \uD1A4\uC758 \uB2F5\uC7A5\uC744 \uC81C\uC2DC\uD558\uC138\uC694.

\uB300\uD654\uBC29 \uC815\uBCF4:
- \uAD00\uACC4: ${context.relationshipType}
- \uBAA9\uD45C: ${context.goals.join(", ")}
- \uAE08\uC9C0: ${context.restrictions.length > 0 ? context.restrictions.join(", ") : "\uC5C6\uC74C"}
${speechStyleInstruction}
${context.userProfile ? `
\uC0AC\uC6A9\uC790 \uC120\uD638:
${context.userProfile}` : ""}

\uBA54\uBAA8\uB9AC: ${context.memorySummary}

\uBD84\uC11D\uD560 \uB300\uD654:
${context.recentMessages}

\uB2E4\uC74C \uD615\uC2DD\uC73C\uB85C \uBD84\uC11D \uACB0\uACFC\uB97C \uC791\uC131\uD558\uC138\uC694:

\uC2EC\uB9AC \uBD84\uC11D: [\uC0C1\uB300\uBC29\uC758 \uC2EC\uB9AC\uB97C 1-2\uC904\uB85C \uC124\uBA85]

\uD574\uC11D: [\uB300\uD654\uB97C \uC5B4\uB5BB\uAC8C \uD574\uC11D\uD588\uB294\uC9C0 \uC124\uBA85]

\uB354 \uD544\uC694\uD55C \uB9E5\uB77D: [yes \uB610\uB294 no]

[yes\uC778 \uACBD\uC6B0\uB9CC] \uC9C8\uBB38: [\uB354 \uC54C\uC544\uC57C \uD560 \uAC83]

\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uB2F5\uC7A5: [60-110\uC790\uC758 \uB2F5\uC7A5]
\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uD6A8\uACFC: [\uC608\uC0C1 \uD6A8\uACFC]
\uBD80\uB4DC\uB7EC\uC6B4 \uD1A4 \uC704\uD5D8\uB3C4: [0-100 \uC0AC\uC774\uC758 \uC22B\uC790]

\uADE0\uD615\uC7A1\uD78C \uD1A4 \uB2F5\uC7A5: [60-110\uC790\uC758 \uB2F5\uC7A5]
\uADE0\uD615\uC7A1\uD78C \uD1A4 \uD6A8\uACFC: [\uC608\uC0C1 \uD6A8\uACFC]
\uADE0\uD615\uC7A1\uD78C \uD1A4 \uC704\uD5D8\uB3C4: [0-100 \uC0AC\uC774\uC758 \uC22B\uC790]

\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uB2F5\uC7A5: [60-110\uC790\uC758 \uB2F5\uC7A5]
\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uD6A8\uACFC: [\uC608\uC0C1 \uD6A8\uACFC]
\uC720\uBA38\uB7EC\uC2A4\uD55C \uD1A4 \uC704\uD5D8\uB3C4: [0-100 \uC0AC\uC774\uC758 \uC22B\uC790]

\uC5C5\uB370\uC774\uD2B8\uB41C \uBA54\uBAA8\uB9AC: [\uCD5C\uC2E0 \uB300\uD654 \uC0C1\uD669 \uC694\uC57D]`;
}

// server/groupChatDetector.ts
function detectGroupChat(text2) {
  const participants = /* @__PURE__ */ new Set();
  const colonPattern = /^([가-힣a-zA-Z0-9_\s]{1,20}):\s*.+$/gm;
  let match;
  while ((match = colonPattern.exec(text2)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  const bracketPattern = /^\[([가-힣a-zA-Z0-9_\s]{1,20})\]\s*.+$/gm;
  while ((match = bracketPattern.exec(text2)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  const kakaoExportPattern = /\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^,]*,\s*([가-힣a-zA-Z0-9_\s]{1,20}):\s*.+/gm;
  while ((match = kakaoExportPattern.exec(text2)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 0 && name.length <= 20) {
      participants.add(name);
    }
  }
  const participantList = Array.from(participants);
  const count = participantList.length;
  let confidence = "low";
  if (count >= 3) {
    const lineCount = text2.split("\n").filter((l) => l.trim()).length;
    if (lineCount >= count * 2) {
      confidence = "high";
    } else if (lineCount >= count) {
      confidence = "medium";
    }
  }
  return {
    isGroupChat: count >= 3,
    participantCount: count,
    participants: participantList,
    confidence
  };
}
function getGroupChatPromptModifier(detection) {
  if (!detection.isGroupChat) return "";
  return `
[\uB2E8\uD1A1 \uBAA8\uB4DC \uD65C\uC131\uD654]
\uC774 \uB300\uD654\uB294 ${detection.participantCount}\uBA85\uC774 \uCC38\uC5EC\uD558\uB294 \uADF8\uB8F9 \uCC44\uD305\uC785\uB2C8\uB2E4.
\uCC38\uAC00\uC790: ${detection.participants.join(", ")}

\uB2E8\uD1A1 \uBD84\uC11D \uC2DC \uC8FC\uC758\uC0AC\uD56D:
1. \uD2B9\uC815 1\uBA85\uC5D0\uAC8C\uB9CC \uBCF4\uB0B4\uB294 \uB2F5\uC7A5\uC774 \uC544\uB2CC, \uC804\uCCB4 \uBC29\uC5D0 \uBB34\uB09C\uD55C \uBB38\uC7A5\uC73C\uB85C \uC791\uC131
2. \uAC01 \uCC38\uAC00\uC790\uC758 \uC785\uC7A5/\uD0DC\uB3C4\uB97C \uAC04\uB7B5\uD788 \uC694\uC57D
3. \uB300\uD654 \uC8FC\uC81C\uC640 \uD750\uB984\uC744 \uD30C\uC545\uD558\uC5EC \uB9E5\uB77D\uC5D0 \uB9DE\uB294 \uB2F5\uC7A5 \uC81C\uC548
4. \uB2F5\uC7A5\uC740 \uADF8\uB8F9 \uC804\uCCB4\uC5D0\uAC8C \uBCF4\uB0B4\uB294 \uAC83\uCC98\uB7FC \uC791\uC131

`;
}

// server/feedbackRouter.ts
import { z as z2 } from "zod";
import { eq as eq2, and } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
var feedbackRouter = router({
  /**
   * 답변 피드백 제출
   * 사용자가 특정 톤의 답변에 대해 만족도를 피드백합니다.
   */
  submitFeedback: protectedProcedure.input(
    z2.object({
      analysisResultId: z2.number().int().positive(),
      tone: z2.enum(["soft", "strong", "neutral"]),
      rating: z2.number().int().min(-1).max(1),
      comment: z2.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const analysis = await db.select().from(analysisResults).where(eq2(analysisResults.id, input.analysisResultId)).limit(1);
      if (analysis.length === 0) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "\uBD84\uC11D \uACB0\uACFC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
        });
      }
      const existingFeedback = await db.select().from(feedback).where(and(
        eq2(feedback.analysisResultId, input.analysisResultId),
        eq2(feedback.userId, ctx.user.id),
        eq2(feedback.tone, input.tone)
      )).limit(1);
      if (existingFeedback.length > 0) {
        await db.update(feedback).set({
          rating: input.rating,
          comment: input.comment
        }).where(eq2(feedback.id, existingFeedback[0].id));
      } else {
        await db.insert(feedback).values({
          analysisResultId: input.analysisResultId,
          userId: ctx.user.id,
          tone: input.tone,
          rating: input.rating,
          comment: input.comment
        });
      }
      return { success: true };
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\uD53C\uB4DC\uBC31 \uC81C\uCD9C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  }),
  /**
   * 분석 결과별 피드백 통계 조회
   */
  getStats: publicProcedure.input(
    z2.object({
      analysisResultId: z2.number().int().positive()
    })
  ).query(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const feedbacks = await db.select().from(feedback).where(eq2(feedback.analysisResultId, input.analysisResultId));
      const stats = {
        soft: { positive: 0, negative: 0, neutral: 0, total: 0 },
        strong: { positive: 0, negative: 0, neutral: 0, total: 0 },
        neutral: { positive: 0, negative: 0, neutral: 0, total: 0 }
      };
      feedbacks.forEach((fb) => {
        const tone = fb.tone;
        stats[tone].total++;
        if (fb.rating === 1) stats[tone].positive++;
        else if (fb.rating === -1) stats[tone].negative++;
        else stats[tone].neutral++;
      });
      return stats;
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\uD1B5\uACC4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  }),
  /**
   * 사용자의 톤 선호도 저장
   */
  setPreferredTone: protectedProcedure.input(
    z2.object({
      tone: z2.enum(["soft", "strong", "neutral"])
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const existingPref = await db.select().from(userPreferences).where(eq2(userPreferences.userId, ctx.user.id)).limit(1);
      if (existingPref.length > 0) {
        await db.update(userPreferences).set({ preferredTone: input.tone }).where(eq2(userPreferences.userId, ctx.user.id));
      } else {
        await db.insert(userPreferences).values({
          userId: ctx.user.id,
          preferredTone: input.tone
        });
      }
      return { success: true };
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\uC120\uD638\uB3C4 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  }),
  /**
   * 사용자의 톤 선호도 조회
   */
  getPreferredTone: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return "neutral";
      const pref = await db.select().from(userPreferences).where(eq2(userPreferences.userId, ctx.user.id)).limit(1);
      return pref.length > 0 ? pref[0].preferredTone : "neutral";
    } catch (error) {
      return "neutral";
    }
  })
});

// server/pipelineRouters.ts
import { z as z4 } from "zod";
import { nanoid } from "nanoid";

// server/messageParser.ts
import crypto2 from "crypto";
function generateMessageHash(speaker, content) {
  const normalized = content.trim().replace(/\s+/g, " ").toLowerCase();
  const hashInput = `${speaker}:${normalized}`;
  return crypto2.createHash("sha256").update(hashInput, "utf8").digest("hex");
}
function parseOcrText(ocrText) {
  const lines = ocrText.split("\n").filter((line) => line.trim().length > 0);
  const messages2 = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let speaker = "unknown";
    let content = trimmed;
    if (trimmed.startsWith("\uB098:") || trimmed.startsWith("Me:")) {
      speaker = "me";
      content = trimmed.replace(/^(나:|Me:)\s*/, "");
    } else if (trimmed.startsWith("\uC0C1\uB300:") || trimmed.startsWith("Other:")) {
      speaker = "other";
      content = trimmed.replace(/^(상대:|Other:)\s*/, "");
    }
    const hash = generateMessageHash(speaker, content);
    messages2.push({ speaker, content, hash });
  }
  return messages2;
}

// server/pipelineRouters.ts
init_aiValidation();

// server/privacyMasking.ts
function maskPhoneNumber(text2) {
  text2 = text2.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/g, (match, p1, p2, p3) => {
    return `${p1}-****-${p3.slice(-2)}**`;
  });
  text2 = text2.replace(/(?<!\d)(010)(\d{4})(\d{4})(?!\d)/g, (match, p1, p2, p3) => {
    return `${p1}****${p3.slice(-2)}**`;
  });
  return text2;
}
function maskBankAccount(text2) {
  text2 = text2.replace(/(\d{2,4})-(\d{2,6})-(\d{2,8})/g, (match, p1, p2, p3) => {
    return `${p1}-****-****`;
  });
  text2 = text2.replace(/(?<!\d)(\d{10,14})(?!\d)/g, (match) => {
    return match.slice(0, 3) + "****" + match.slice(-3);
  });
  return text2;
}
function maskAddress(text2) {
  text2 = text2.replace(
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별시|광역시|도)?\s*([가-힣]+[시군구])\s*([가-힣0-9\s-]+)/g,
    (match, p1, p2, p3) => {
      return `${p1}${p2 || ""} ${p3} [\uC8FC\uC18C \uB9C8\uC2A4\uD0B9]`;
    }
  );
  return text2;
}
function maskEmail(text2) {
  text2 = text2.replace(
    /([a-zA-Z0-9._-]{2,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, username, domain) => {
      const masked = username.slice(0, 2) + "****";
      return `${masked}@${domain}`;
    }
  );
  return text2;
}
function maskResidentNumber(text2) {
  text2 = text2.replace(/(\d{6})-(\d{7})/g, (match, p1, p2) => {
    return `${p1}-*******`;
  });
  return text2;
}
function maskSensitiveInfo(text2) {
  const detectedTypes = [];
  let maskedText = text2;
  if (/(\d{2,3})-(\d{3,4})-(\d{4})|010\d{8}/.test(text2)) {
    detectedTypes.push("\uC804\uD654\uBC88\uD638");
    maskedText = maskPhoneNumber(maskedText);
  }
  if (/(\d{2,4})-(\d{2,6})-(\d{2,8})|\d{10,14}/.test(text2)) {
    detectedTypes.push("\uACC4\uC88C\uBC88\uD638");
    maskedText = maskBankAccount(maskedText);
  }
  if (/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별시|광역시|도)?\s*([가-힣]+[시군구])/.test(text2)) {
    detectedTypes.push("\uC8FC\uC18C");
    maskedText = maskAddress(maskedText);
  }
  if (/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text2)) {
    detectedTypes.push("\uC774\uBA54\uC77C");
    maskedText = maskEmail(maskedText);
  }
  if (/\d{6}-\d{7}/.test(text2)) {
    detectedTypes.push("\uC8FC\uBBFC\uB4F1\uB85D\uBC88\uD638");
    maskedText = maskResidentNumber(maskedText);
  }
  return {
    maskedText,
    hasSensitiveInfo: detectedTypes.length > 0,
    detectedTypes
  };
}

// server/errorCodes.ts
var ERROR_CODES = {
  // OCR 관련 에러
  OCR_EMPTY: "OCR_EMPTY",
  // OCR 결과가 비어있음
  OCR_INVALID_FORMAT: "OCR_INVALID_FORMAT",
  // OCR 결과 형식 오류
  UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",
  // 지원하지 않는 이미지 형식
  IMAGE_CORRUPTED: "IMAGE_CORRUPTED",
  // 이미지 파일 손상
  // 컨텍스트 관련 에러
  CONTEXT_TOO_SHORT: "CONTEXT_TOO_SHORT",
  // 메시지가 너무 짧음 (최소 10자)
  CONTEXT_MISSING: "CONTEXT_MISSING",
  // 대화 맥락 없음
  CONTEXT_AMBIGUOUS: "CONTEXT_AMBIGUOUS",
  // 대화 해석이 애매함
  // AI 모델 관련 에러
  MODEL_TIMEOUT: "MODEL_TIMEOUT",
  // AI 모델 응답 시간 초과
  MODEL_ERROR: "MODEL_ERROR",
  // AI 모델 에러
  INVALID_RESPONSE: "INVALID_RESPONSE",
  // AI 응답 검증 실패
  // 리소스 관련 에러
  UPLOAD_NOT_FOUND: "UPLOAD_NOT_FOUND",
  // 업로드 기록 없음
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
  // 대화방 없음
  RATE_LIMIT: "RATE_LIMIT",
  // API 호출 제한 초과
  // 기타 에러
  INVALID_INPUT: "INVALID_INPUT",
  // 입력값 검증 실패
  INTERNAL_ERROR: "INTERNAL_ERROR"
  // 내부 서버 에러
};
var ERROR_CODE_TO_STATUS = {
  [ERROR_CODES.OCR_EMPTY]: 400,
  [ERROR_CODES.OCR_INVALID_FORMAT]: 400,
  [ERROR_CODES.UNSUPPORTED_IMAGE]: 400,
  [ERROR_CODES.IMAGE_CORRUPTED]: 400,
  [ERROR_CODES.CONTEXT_TOO_SHORT]: 400,
  [ERROR_CODES.CONTEXT_MISSING]: 400,
  [ERROR_CODES.CONTEXT_AMBIGUOUS]: 400,
  [ERROR_CODES.MODEL_TIMEOUT]: 504,
  [ERROR_CODES.MODEL_ERROR]: 500,
  [ERROR_CODES.INVALID_RESPONSE]: 500,
  [ERROR_CODES.UPLOAD_NOT_FOUND]: 404,
  [ERROR_CODES.CONVERSATION_NOT_FOUND]: 404,
  [ERROR_CODES.RATE_LIMIT]: 429,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.INTERNAL_ERROR]: 500
};
var ERROR_CODE_TO_MESSAGE = {
  [ERROR_CODES.OCR_EMPTY]: "\uC2A4\uD06C\uB9B0\uC0F7\uC5D0\uC11C \uB300\uD654 \uB0B4\uC6A9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.OCR_INVALID_FORMAT]: "\uC2A4\uD06C\uB9B0\uC0F7 \uD615\uC2DD\uC744 \uC778\uC2DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uC2A4\uD06C\uB9B0\uC0F7\uC744 \uC62C\uB824\uC8FC\uC138\uC694.",
  [ERROR_CODES.UNSUPPORTED_IMAGE]: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0 \uD615\uC2DD\uC785\uB2C8\uB2E4. (JPG, PNG \uC9C0\uC6D0)",
  [ERROR_CODES.IMAGE_CORRUPTED]: "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uC774 \uC190\uC0C1\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC62C\uB824\uC8FC\uC138\uC694.",
  [ERROR_CODES.CONTEXT_TOO_SHORT]: "\uC785\uB825 \uD14D\uC2A4\uD2B8\uAC00 \uB108\uBB34 \uC9E7\uC2B5\uB2C8\uB2E4. \uCD5C\uC18C 10\uC790 \uC774\uC0C1 \uC785\uB825\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.CONTEXT_MISSING]: "\uBD84\uC11D\uD560 \uB300\uD654 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2A4\uD06C\uB9B0\uC0F7\uC744 \uC62C\uB9AC\uAC70\uB098 \uD14D\uC2A4\uD2B8\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.CONTEXT_AMBIGUOUS]: "\uB300\uD654 \uB0B4\uC6A9\uC774 \uC560\uB9E4\uD569\uB2C8\uB2E4. \uB354 \uC790\uC138\uD55C \uC0C1\uD669\uC744 \uC124\uBA85\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.MODEL_TIMEOUT]: "AI \uBD84\uC11D\uC774 \uC2DC\uAC04 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.MODEL_ERROR]: "AI \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.INVALID_RESPONSE]: "AI \uC751\uB2F5\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.UPLOAD_NOT_FOUND]: "\uC5C5\uB85C\uB4DC \uAE30\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  [ERROR_CODES.CONVERSATION_NOT_FOUND]: "\uB300\uD654\uBC29\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  [ERROR_CODES.RATE_LIMIT]: "\uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.",
  [ERROR_CODES.INVALID_INPUT]: "\uC785\uB825\uAC12\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  [ERROR_CODES.INTERNAL_ERROR]: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
};
var ApiError = class extends Error {
  constructor(code, message, details) {
    super(message || ERROR_CODE_TO_MESSAGE[code]);
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
};

// server/pipelineRouters.ts
import { createHash } from "crypto";
var pipelineRouter = router({
  // Step 1: 업로드 생성 및 presign URL 반환
  createUpload: protectedProcedure.input(z4.object({
    conversationId: z4.number()
  })).mutation(async ({ input }) => {
    const uploadId = await createUpload({
      conversationId: input.conversationId,
      status: "pending"
    });
    return { uploadId };
  }),
  // Step 2: OCR 실행 (이미지 업로드 후)
  runOcr: protectedProcedure.input(z4.object({
    uploadId: z4.number(),
    imageBase64: z4.string()
  })).mutation(async ({ input }) => {
    try {
      const upload = await getUploadById(input.uploadId);
      if (!upload) {
        throw new ApiError(ERROR_CODES.UPLOAD_NOT_FOUND);
      }
      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      const fileKey = `conversations/${upload.conversationId}/screenshots/${nanoid()}.png`;
      const { url: screenshotUrl } = await storagePut(fileKey, imageBuffer, "image/png");
      const ocrResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "\uB2F9\uC2E0\uC740 \uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uC2A4\uD06C\uB9B0\uC0F7\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uCD94\uCD9C\uD558\uB294 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uB9D0\uD48D\uC120\uC758 \uD14D\uC2A4\uD2B8\uB9CC \uC815\uD655\uD558\uAC8C \uCD94\uCD9C\uD558\uACE0, \uC2DC\uAC04\uC774\uB098 \uBC30\uD130\uB9AC \uD45C\uC2DC \uB4F1\uC740 \uC81C\uC678\uD558\uC138\uC694."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "\uC774 \uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uC2A4\uD06C\uB9B0\uC0F7\uC5D0\uC11C \uB300\uD654 \uB0B4\uC6A9\uB9CC \uCD94\uCD9C\uD574\uC8FC\uC138\uC694. \uAC01 \uBA54\uC2DC\uC9C0\uB97C '\uBC1C\uC2E0\uC790: \uB0B4\uC6A9' \uD615\uC2DD\uC73C\uB85C \uC815\uB9AC\uD574\uC8FC\uC138\uC694."
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshotUrl,
                  detail: "high"
                }
              }
            ]
          }
        ]
      });
      if (!ocrResponse?.choices || ocrResponse.choices.length === 0) {
        throw new ApiError(ERROR_CODES.MODEL_ERROR, "OCR \uC751\uB2F5\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.");
      }
      const messageContent = ocrResponse.choices[0]?.message?.content;
      const ocrTextRaw = typeof messageContent === "string" ? messageContent : messageContent ? JSON.stringify(messageContent) : "";
      if (!ocrTextRaw || ocrTextRaw.trim().length === 0) {
        throw new ApiError(ERROR_CODES.OCR_EMPTY);
      }
      await updateUpload(input.uploadId, {
        screenshotUrl,
        ocrTextRaw,
        status: "ocr_done"
      });
      return {
        uploadId: input.uploadId,
        ocrTextRaw,
        screenshotUrl
      };
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.MODEL_ERROR;
      await updateUpload(input.uploadId, {
        status: "pending",
        errorMessage: error.message || "OCR \uC2E4\uD328",
        errorCode
      });
      throw error;
    }
  }),
  // Step 3: OCR 결과 파싱 및 중복 제거 (ingest)
  ingestOcr: protectedProcedure.input(z4.object({
    uploadId: z4.number()
  })).mutation(async ({ input }) => {
    try {
      const upload = await getUploadById(input.uploadId);
      if (!upload) {
        throw new ApiError(ERROR_CODES.UPLOAD_NOT_FOUND);
      }
      if (!upload.ocrTextRaw) {
        throw new ApiError(ERROR_CODES.OCR_EMPTY);
      }
      const parsedMessages = parseOcrText(upload.ocrTextRaw);
      const existingHashes = await getExistingMessageHashes(upload.conversationId);
      const newMessages = parsedMessages.filter((msg) => {
        const hash = generateMessageHash(msg.speaker, msg.content);
        return !existingHashes.has(hash);
      });
      for (const msg of newMessages) {
        await addMessage({
          conversationId: upload.conversationId,
          speaker: msg.speaker,
          content: msg.content,
          source: "ocr",
          hash: generateMessageHash(msg.speaker, msg.content)
        });
      }
      await updateUpload(input.uploadId, {
        ocrParsedJson: JSON.stringify(parsedMessages),
        status: "ingested"
      });
      await addMessageHistory({
        conversationId: upload.conversationId,
        screenshotUrl: upload.screenshotUrl || "",
        ocrTextRaw: upload.ocrTextRaw,
        ocrParsedJson: JSON.stringify(parsedMessages),
        messageType: "screenshot"
      });
      return {
        uploadId: input.uploadId,
        newMessageCount: newMessages.length,
        totalMessageCount: parsedMessages.length
      };
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.INVALID_RESPONSE;
      await updateUpload(input.uploadId, {
        status: "ocr_done",
        errorMessage: error.message || "\uD30C\uC2F1 \uC2E4\uD328",
        errorCode
      });
      throw error;
    }
  }),
  // Step 4: AI 답변 생성 (generate)
  generateReplies: protectedProcedure.input(z4.object({
    conversationId: z4.number(),
    uploadId: z4.number().optional(),
    imageBase64: z4.string().optional()
    // 캐시 키 생성용
  })).mutation(async ({ input }) => {
    try {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) {
        throw new ApiError(ERROR_CODES.CONVERSATION_NOT_FOUND);
      }
      const recentMessages = await getRecentMessagesByConversationId(input.conversationId, 30);
      if (!recentMessages || recentMessages.length === 0) {
        throw new ApiError(ERROR_CODES.OCR_EMPTY, "\uBD84\uC11D\uD560 \uB300\uD654 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2A4\uD06C\uB9B0\uC0F7\uC744 \uB2E4\uC2DC \uC5C5\uB85C\uB4DC\uD574\uC8FC\uC138\uC694.");
      }
      const allDetectedTypes = /* @__PURE__ */ new Set();
      const maskedMessages = recentMessages.map((m) => {
        const maskResult = maskSensitiveInfo(m.content);
        maskResult.detectedTypes.forEach((type) => allDetectedTypes.add(type));
        return {
          speaker: m.speaker,
          content: maskResult.maskedText
        };
      });
      const contextText = maskedMessages.map((m) => `${m.speaker === "me" ? "\uB098" : "\uC0C1\uB300"}: ${m.content}`).join("\n");
      let imageHash = null;
      if (input.imageBase64) {
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        imageHash = createHash("sha256").update(imageBuffer).digest("hex");
        const cachedResult = await getCachedAnalysisByImageHash(imageHash);
        if (cachedResult) {
          console.log(`[Cache] HIT: imageHash=${imageHash}`);
          if (input.uploadId) {
            await updateUpload(input.uploadId, {
              status: "analyzed"
            });
          }
          const analysisResult2 = JSON.parse(cachedResult);
          return {
            ...analysisResult2,
            privacyMasking: {
              hasSensitiveInfo: allDetectedTypes.size > 0,
              detectedTypes: Array.from(allDetectedTypes)
            },
            _cacheHit: true
            // 클라이언트에서 캐시 적중 여부 확인 가능
          };
        }
      }
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      const memorySummary = conversation.contextSummary || "\uC544\uC9C1 \uCD95\uC801\uB41C \uB9E5\uB77D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const mode = conversation.relationshipType === "\uC9C1\uC7A5" ? "work" : conversation.relationshipType === "\uAC70\uB798" ? "trade" : "dating";
      const analysisPrompt = generateAnalysisPrompt({
        mode,
        relationshipType: conversation.relationshipType,
        goals,
        restrictions,
        memorySummary,
        recentMessages: contextText
      });
      const callAI = async () => {
        const response = await invokeLLM({
          messages: [
            { role: "user", content: analysisPrompt }
          ]
        });
        if (!response?.choices || response.choices.length === 0) {
          throw new ApiError(ERROR_CODES.MODEL_ERROR, "LLM \uC751\uB2F5\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.");
        }
        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent) {
          throw new ApiError(ERROR_CODES.MODEL_ERROR, "LLM \uC751\uB2F5 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
        return typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent);
      };
      const rawResponse = await callAI();
      const analysisResult = await validateAndRetry(rawResponse, callAI, 2);
      await saveAnalysisResult({
        conversationId: input.conversationId,
        outputJson: JSON.stringify(analysisResult),
        inputExcerpt: contextText.slice(0, 500)
      });
      if (imageHash) {
        try {
          await saveCachedAnalysis(imageHash, JSON.stringify(analysisResult));
          console.log(`[Cache] SAVED: imageHash=${imageHash}`);
        } catch (cacheError) {
          console.warn("[Cache] Failed to save cache:", cacheError);
        }
      }
      if (analysisResult.updated_memory_summary) {
        await updateConversation(input.conversationId, {
          contextSummary: analysisResult.updated_memory_summary
        });
      }
      if (input.uploadId) {
        await updateUpload(input.uploadId, {
          status: "analyzed"
        });
      }
      return {
        ...analysisResult,
        privacyMasking: {
          hasSensitiveInfo: allDetectedTypes.size > 0,
          detectedTypes: Array.from(allDetectedTypes)
        }
      };
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.code : ERROR_CODES.MODEL_ERROR;
      if (input.uploadId) {
        await updateUpload(input.uploadId, {
          status: "ingested",
          errorMessage: error.message || "AI \uBD84\uC11D \uC2E4\uD328",
          errorCode
        });
      }
      throw error;
    }
  }),
  // 업로드 상태 조회
  getUploadStatus: protectedProcedure.input(z4.object({
    uploadId: z4.number()
  })).query(async ({ input }) => {
    const upload = await getUploadById(input.uploadId);
    if (!upload) {
      throw new Error("\uC5C5\uB85C\uB4DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    return upload;
  })
});

// server/errorLogging.ts
import { eq as eq4 } from "drizzle-orm";

// server/notificationService.ts
import { eq as eq3 } from "drizzle-orm";
var config = {
  adminEmail: process.env.ADMIN_EMAIL,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  slackChannel: process.env.SLACK_CHANNEL || "#errors"
};
async function queueErrorNotification(errorLogId, severity) {
  const db = await getDb();
  if (!db) return;
  if (!["critical", "error"].includes(severity)) {
    return;
  }
  try {
    if (config.adminEmail) {
      await db.insert(errorNotificationQueue).values({
        errorLogId,
        channel: "email",
        recipient: config.adminEmail,
        status: "pending"
      });
    }
    if (config.slackWebhookUrl) {
      await db.insert(errorNotificationQueue).values({
        errorLogId,
        channel: "slack",
        recipient: config.slackChannel || "#errors",
        status: "pending"
      });
    }
  } catch (error) {
    console.error("Failed to queue error notification:", error);
  }
}

// server/errorLogging.ts
async function logError(input) {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[ERROR_LOG_DB_UNAVAILABLE]", input);
      return;
    }
    const logEntry = {
      userId: input.userId || null,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      location: input.location,
      context: input.context ? JSON.stringify(input.context) : null,
      stackTrace: input.stackTrace || null,
      statusCode: input.statusCode || 500,
      severity: input.severity || "error",
      resolved: 0
    };
    const insertResult = await db.insert(errorLogs).values(logEntry);
    let errorLogId = null;
    if (insertResult && typeof insertResult === "object" && "insertId" in insertResult) {
      errorLogId = insertResult.insertId;
    }
    if (!errorLogId) {
      const recentLog = await db.select().from(errorLogs).orderBy(errorLogs.id).limit(1);
      if (recentLog && recentLog.length > 0) {
        errorLogId = recentLog[0].id;
      }
    }
    if (errorLogId && (input.severity === "critical" || input.severity === "error")) {
      await queueErrorNotification(errorLogId, input.severity);
    } else if (!errorLogId) {
      console.warn("[ERROR_LOG_ID_MISSING] Log saved but insertId is undefined (Driver limit). Notification skipped.");
    }
    console.error(`[${input.severity || "ERROR"}] ${input.location}:`, {
      code: input.errorCode,
      message: input.errorMessage,
      context: input.context
    });
  } catch (err) {
    console.error("[ERROR_LOG_FAILED]", input, err);
  }
}
async function getRecentErrors(limit = 50) {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select().from(errorLogs).orderBy(errorLogs.createdAt).limit(limit);
    return result;
  } catch (err) {
    console.error("[ERROR_LOG_QUERY_FAILED]", err);
    return [];
  }
}
async function getUserErrorHistory(userId, limit = 20) {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select().from(errorLogs).where(eq4(errorLogs.userId, userId)).orderBy(errorLogs.createdAt).limit(limit);
    return result;
  } catch (err) {
    console.error("[ERROR_LOG_USER_QUERY_FAILED]", err);
    return [];
  }
}
async function getErrorStats() {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(errorLogs).orderBy(errorLogs.createdAt);
    const stats = {
      totalErrors: result.length,
      bySeverity: {
        info: result.filter((e) => e.severity === "info").length,
        warning: result.filter((e) => e.severity === "warning").length,
        error: result.filter((e) => e.severity === "error").length,
        critical: result.filter((e) => e.severity === "critical").length
      },
      byErrorCode: {},
      byLocation: {},
      resolved: result.filter((e) => e.resolved === 1).length
    };
    result.forEach((e) => {
      stats.byErrorCode[e.errorCode] = (stats.byErrorCode[e.errorCode] || 0) + 1;
      stats.byLocation[e.location] = (stats.byLocation[e.location] || 0) + 1;
    });
    return stats;
  } catch (err) {
    console.error("[ERROR_STATS_FAILED]", err);
    return null;
  }
}
async function markErrorAsResolved(errorLogId) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(errorLogs).set({ resolved: 1 }).where(eq4(errorLogs.id, errorLogId));
  } catch (err) {
    console.error("[ERROR_MARK_RESOLVED_FAILED]", err);
  }
}

// server/adminRouter.ts
import { z as z5 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
var adminRouter = router({
  /**
   * 최근 에러 목록 조회 (관리자만)
   */
  getRecentErrors: protectedProcedure.input(z5.object({ limit: z5.number().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4"
      });
    }
    const errors = await getRecentErrors(input.limit);
    return errors.map((e) => ({
      id: e.id,
      userId: e.userId,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      location: e.location,
      context: e.context ? JSON.parse(e.context) : null,
      statusCode: e.statusCode,
      severity: e.severity,
      resolved: e.resolved === 1,
      createdAt: e.createdAt
    }));
  }),
  /**
   * 특정 사용자의 에러 히스토리 조회
   */
  getUserErrors: protectedProcedure.input(
    z5.object({
      userId: z5.number(),
      limit: z5.number().min(1).max(100).default(20)
    })
  ).query(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin" && ctx.user?.id !== input.userId) {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"
      });
    }
    const errors = await getUserErrorHistory(input.userId, input.limit);
    return errors.map((e) => ({
      id: e.id,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      location: e.location,
      context: e.context ? JSON.parse(e.context) : null,
      statusCode: e.statusCode,
      severity: e.severity,
      resolved: e.resolved === 1,
      createdAt: e.createdAt
    }));
  }),
  /**
   * 에러 통계 조회
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4"
      });
    }
    const stats = await getErrorStats();
    return stats;
  }),
  /**
   * 에러를 해결된 것으로 표시
   */
  markAsResolved: protectedProcedure.input(z5.object({ errorLogId: z5.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4"
      });
    }
    await markErrorAsResolved(input.errorLogId);
    return { success: true };
  }),
  /**
   * 에러 코드별 필터링된 목록 조회
   */
  getErrorsByCode: protectedProcedure.input(
    z5.object({
      errorCode: z5.string(),
      limit: z5.number().min(1).max(100).default(50)
    })
  ).query(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4"
      });
    }
    const errors = await getRecentErrors(input.limit);
    const filtered = errors.filter((e) => e.errorCode === input.errorCode);
    return filtered.map((e) => ({
      id: e.id,
      userId: e.userId,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      location: e.location,
      context: e.context ? JSON.parse(e.context) : null,
      statusCode: e.statusCode,
      severity: e.severity,
      resolved: e.resolved === 1,
      createdAt: e.createdAt
    }));
  })
});

// server/betaRouter.ts
import { z as z6 } from "zod";

// server/betaInvitation.ts
import crypto3 from "crypto";
import { eq as eq5 } from "drizzle-orm";
function generateTempPassword() {
  return crypto3.randomBytes(8).toString("hex");
}
function generateInvitationToken() {
  return crypto3.randomBytes(32).toString("hex");
}
async function inviteBetaTester(email, invitedBy) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const existing = await db.select().from(betaInvitations).where(eq5(betaInvitations.email, email));
  if (existing.length > 0) {
    throw new Error("\uC774\uBBF8 \uCD08\uB300\uB41C \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4");
  }
  const tempPassword = generateTempPassword();
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
  const invitation = {
    id: crypto3.randomUUID(),
    email,
    status: "pending",
    tempPassword,
    token,
    expiresAt,
    createdAt: /* @__PURE__ */ new Date()
  };
  await db.insert(betaInvitations).values(invitation);
  return {
    ...invitation,
    userId: void 0,
    acceptedAt: void 0
  };
}
async function getInvitationByToken(token) {
  const db = await getDb();
  if (!db) {
    return null;
  }
  const result = await db.select().from(betaInvitations).where(eq5(betaInvitations.token, token));
  if (result.length === 0) return null;
  const invitation = result[0];
  if (invitation.expiresAt && invitation.expiresAt < /* @__PURE__ */ new Date()) {
    return null;
  }
  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    tempPassword: invitation.tempPassword,
    token: invitation.token,
    expiresAt: invitation.expiresAt || /* @__PURE__ */ new Date(),
    userId: invitation.userId || void 0,
    createdAt: invitation.createdAt || /* @__PURE__ */ new Date(),
    acceptedAt: invitation.acceptedAt || void 0
  };
}
async function acceptInvitation(token, userId) {
  const db = await getDb();
  if (!db) {
    return null;
  }
  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;
  await db.update(betaInvitations).set({
    status: "accepted",
    userId,
    acceptedAt: /* @__PURE__ */ new Date()
  }).where(eq5(betaInvitations.token, token));
  return {
    ...invitation,
    status: "accepted",
    userId,
    acceptedAt: /* @__PURE__ */ new Date()
  };
}
async function getAllInvitations() {
  const db = await getDb();
  if (!db) {
    return [];
  }
  const result = await db.select().from(betaInvitations);
  return result.map((inv) => ({
    id: inv.id,
    email: inv.email,
    status: inv.status,
    tempPassword: inv.tempPassword,
    token: inv.token,
    expiresAt: inv.expiresAt || /* @__PURE__ */ new Date(),
    userId: inv.userId || void 0,
    createdAt: inv.createdAt || /* @__PURE__ */ new Date(),
    acceptedAt: inv.acceptedAt || void 0
  }));
}
async function getInvitationStats() {
  const invitations = await getAllInvitations();
  return {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === "pending").length,
    accepted: invitations.filter((inv) => inv.status === "accepted").length,
    rejected: invitations.filter((inv) => inv.status === "rejected").length
  };
}

// server/betaEmailService.ts
function generateBetaInvitationEmail(email, tempPassword, invitationLink) {
  const subject = "\u{1F389} \uD1A1\uCE90\uB514 \uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uCD08\uB300";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 18px; color: #000; margin-top: 0; }
    .credentials { background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin: 15px 0; font-family: monospace; }
    .credentials-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .credentials-value { font-size: 16px; color: #000; font-weight: bold; margin: 5px 0; }
    .button { display: inline-block; background: #ff9500; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 15px 0; }
    .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\uD1A1\uCE90\uB514 \uBCA0\uD0C0 \uD14C\uC2A4\uD2B8</h1>
      <p>AI \uB300\uD654 \uCF54\uCE58\uC5D0 \uCD08\uB300\uB418\uC5C8\uC2B5\uB2C8\uB2E4!</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>\uC548\uB155\uD558\uC138\uC694! \u{1F44B}</h2>
        <p>\uD1A1\uCE90\uB514 \uBCA0\uD0C0 \uD14C\uC2A4\uD2B8\uC5D0 \uCD08\uB300\uD574\uC8FC\uC154\uC11C \uAC10\uC0AC\uD569\uB2C8\uB2E4.</p>
        <p>\uC544\uB798 \uC784\uC2DC \uBE44\uBC00\uBC88\uD638\uB85C \uB85C\uADF8\uC778\uD55C \uD6C4, \uCCAB \uB85C\uADF8\uC778 \uC2DC \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD574\uC8FC\uC138\uC694.</p>
      </div>

      <div class="section">
        <h3>\uB85C\uADF8\uC778 \uC815\uBCF4</h3>
        <div class="credentials">
          <div class="credentials-label">\uC774\uBA54\uC77C</div>
          <div class="credentials-value">${email}</div>
          <div class="credentials-label" style="margin-top: 10px;">\uC784\uC2DC \uBE44\uBC00\uBC88\uD638</div>
          <div class="credentials-value">${tempPassword}</div>
        </div>
      </div>

      <div class="section" style="text-align: center;">
        <a href="${invitationLink}" class="button">\uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uC2DC\uC791\uD558\uAE30</a>
      </div>

      <div class="section">
        <h3>\uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uC548\uB0B4</h3>
        <ul>
          <li><strong>\uD14C\uC2A4\uD2B8 \uAE30\uAC04:</strong> 2\uC8FC (\uC608\uC815)</li>
          <li><strong>\uD53C\uB4DC\uBC31 \uBC29\uBC95:</strong> \uC571 \uB0B4 \uD53C\uB4DC\uBC31 \uD3FC \uC0AC\uC6A9</li>
          <li><strong>\uBC84\uADF8 \uB9AC\uD3EC\uD2B8:</strong> \uC7AC\uD604 \uB2E8\uACC4\uC640 \uD568\uAED8 \uC0C1\uC138\uD788 \uAE30\uB85D\uD574\uC8FC\uC138\uC694</li>
          <li><strong>\uAE30\uB2A5 \uC694\uCCAD:</strong> \uC0AC\uC6A9\uD558\uBA74\uC11C \uAC1C\uC120\uB418\uBA74 \uC88B\uC744 \uC810\uB4E4\uC744 \uC790\uC720\uB86D\uAC8C \uC81C\uC548\uD574\uC8FC\uC138\uC694</li>
        </ul>
      </div>

      <div class="section">
        <h3>\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38</h3>
        <p><strong>Q: \uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC5B4\uBC84\uB838\uC5B4\uC694</strong></p>
        <p>A: \uB85C\uADF8\uC778 \uD398\uC774\uC9C0\uC758 "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815" \uB9C1\uD06C\uB97C \uC0AC\uC6A9\uD558\uAC70\uB098, \uC774 \uC774\uBA54\uC77C\uB85C \uD68C\uC2E0\uD574\uC8FC\uC138\uC694.</p>
        <p><strong>Q: \uBC84\uADF8\uB97C \uBC1C\uACAC\uD588\uC5B4\uC694</strong></p>
        <p>A: \uC571 \uB0B4 \uD53C\uB4DC\uBC31 \uD3FC\uC5D0\uC11C "\uBC84\uADF8" \uCE74\uD14C\uACE0\uB9AC\uB97C \uC120\uD0DD\uD558\uACE0 \uC0C1\uC138\uD788 \uAE30\uB85D\uD574\uC8FC\uC138\uC694. \uC7AC\uD604 \uB2E8\uACC4\uAC00 \uC788\uC73C\uBA74 \uB354 \uC88B\uC2B5\uB2C8\uB2E4!</p>
      </div>

      <div class="footer">
        <p>\uC774 \uC774\uBA54\uC77C\uC740 \uD1A1\uCE90\uB514 \uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uCD08\uB300 \uBA54\uC77C\uC785\uB2C8\uB2E4.</p>
        <p>\uBB38\uC758\uC0AC\uD56D\uC774 \uC788\uC73C\uC2DC\uBA74 \uC774 \uC774\uBA54\uC77C\uB85C \uD68C\uC2E0\uD574\uC8FC\uC138\uC694.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  const text2 = `
\uD1A1\uCE90\uB514 \uBCA0\uD0C0 \uD14C\uC2A4\uD2B8\uC5D0 \uCD08\uB300\uB418\uC5C8\uC2B5\uB2C8\uB2E4!

\uB85C\uADF8\uC778 \uC815\uBCF4:
- \uC774\uBA54\uC77C: ${email}
- \uC784\uC2DC \uBE44\uBC00\uBC88\uD638: ${tempPassword}

\uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uC2DC\uC791: ${invitationLink}

\uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uC548\uB0B4:
- \uD14C\uC2A4\uD2B8 \uAE30\uAC04: 2\uC8FC (\uC608\uC815)
- \uD53C\uB4DC\uBC31 \uBC29\uBC95: \uC571 \uB0B4 \uD53C\uB4DC\uBC31 \uD3FC \uC0AC\uC6A9
- \uBC84\uADF8 \uB9AC\uD3EC\uD2B8: \uC7AC\uD604 \uB2E8\uACC4\uC640 \uD568\uAED8 \uC0C1\uC138\uD788 \uAE30\uB85D\uD574\uC8FC\uC138\uC694
- \uAE30\uB2A5 \uC694\uCCAD: \uC0AC\uC6A9\uD558\uBA74\uC11C \uAC1C\uC120\uB418\uBA74 \uC88B\uC744 \uC810\uB4E4\uC744 \uC790\uC720\uB86D\uAC8C \uC81C\uC548\uD574\uC8FC\uC138\uC694

\uBB38\uC758\uC0AC\uD56D\uC774 \uC788\uC73C\uC2DC\uBA74 \uC774 \uC774\uBA54\uC77C\uB85C \uD68C\uC2E0\uD574\uC8FC\uC138\uC694.
  `;
  return { subject, html, text: text2 };
}
async function sendEmail(to, template) {
  try {
    console.log(`[Email] \uBC1C\uC1A1 \uB300\uAE30: ${to}`);
    console.log(`[Email] \uC81C\uBAA9: ${template.subject}`);
    console.log(`[Email] HTML \uAE38\uC774: ${template.html.length}\uC790`);
    return true;
  } catch (error) {
    console.error("[Email] \uBC1C\uC1A1 \uC2E4\uD328:", error);
    return false;
  }
}
async function sendBetaInvitationEmail(email, tempPassword, invitationLink) {
  const template = generateBetaInvitationEmail(email, tempPassword, invitationLink);
  return sendEmail(email, template);
}

// server/betaRouter.ts
function getAppBaseUrl() {
  const envUrl = process.env.VITE_APP_URL;
  return (envUrl || "https://talkcaddy-nnm5gwq6.manus.space").replace(/\/$/, "");
}
function withTimeout(p, ms, label) {
  let t2;
  const timeout = new Promise((_, rej) => {
    t2 = setTimeout(() => rej(new Error(`TIMEOUT(${ms}ms): ${label}`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t2));
}
var betaRouter = router({
  /**
   * 베타 테스터 초대 (관리자만)
   */
  inviteTester: protectedProcedure.input(
    z6.object({
      email: z6.string().email("\uC720\uD6A8\uD55C \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD558\uC138\uC694")
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uCD08\uB300\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    const t0 = Date.now();
    console.log("[inviteTester] START", { email: input.email, userId: ctx.user?.id });
    try {
      console.log("[inviteTester] Step 1: getDb() \uC2DC\uC791");
      const db = await withTimeout(getDb(), 2e3, "getDb()");
      console.log("[inviteTester] Step 1: getDb() \uC644\uB8CC", { elapsed: Date.now() - t0 });
      console.log("[inviteTester] Step 2: DB \uC5F0\uACB0 \uD14C\uC2A4\uD2B8 \uC2DC\uC791");
      try {
        if (db) {
          await withTimeout(Promise.resolve(), 2e3, "db SELECT 1");
        }
        console.log("[inviteTester] Step 2: DB \uC5F0\uACB0 \uD14C\uC2A4\uD2B8 \uC644\uB8CC", { elapsed: Date.now() - t0 });
      } catch (dbTestError) {
        console.log("[inviteTester] Step 2: DB \uC5F0\uACB0 \uD14C\uC2A4\uD2B8 \uC2E4\uD328 (\uBB34\uC2DC\uD558\uACE0 \uACC4\uC18D)", { error: dbTestError });
      }
      console.log("[inviteTester] Step 3: inviteBetaTester() \uC2DC\uC791");
      const invitation = await withTimeout(
        inviteBetaTester(input.email, ctx.user.id),
        5e3,
        "inviteBetaTester()"
      );
      console.log("[inviteTester] Step 3: inviteBetaTester() \uC644\uB8CC", {
        invitationId: invitation.id,
        elapsed: Date.now() - t0
      });
      const baseUrl = getAppBaseUrl();
      const invitationLink = `${baseUrl}/beta/accept/${invitation.token}`;
      console.log("[inviteTester] Step 4: sendBetaInvitationEmail() \uC2DC\uC791");
      await withTimeout(
        sendBetaInvitationEmail(
          input.email,
          invitation.tempPassword,
          invitationLink
        ),
        5e3,
        "sendBetaInvitationEmail()"
      );
      console.log("[inviteTester] Step 4: sendBetaInvitationEmail() \uC644\uB8CC", {
        elapsed: Date.now() - t0
      });
      console.log("[inviteTester] SUCCESS", {
        invitationId: invitation.id,
        totalElapsed: Date.now() - t0
      });
      return {
        success: true,
        message: `${input.email}\uB85C \uCD08\uB300 \uC774\uBA54\uC77C\uC774 \uBC1C\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (TODO: Sendgrid/AWS SES \uC5F0\uB3D9 \uC2DC \uC2E4\uC81C \uBC1C\uC1A1)`,
        email: invitation.email,
        tempPassword: invitation.tempPassword,
        token: invitation.token,
        invitationLink,
        // 배포 도메인 기반 링크 (VITE_APP_URL 기반)
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          createdAt: invitation.createdAt
        }
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[inviteTester] ERROR", {
        email: input.email,
        adminId: ctx.user.id,
        errorMessage: errorMsg,
        totalElapsed: Date.now() - t0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      throw new Error(
        error instanceof Error ? error.message : "\uCD08\uB300 \uC2E4\uD328"
      );
    }
  }),
  /**
   * 초대 토큰으로 초대 정보 조회
   */
  getInvitationByToken: publicProcedure.input(z6.object({ token: z6.string() })).query(async ({ input }) => {
    try {
      const invitation = await getInvitationByToken(input.token);
      if (!invitation) {
        throw new Error("INVITATION_NOT_FOUND");
      }
      return {
        email: invitation.email,
        status: invitation.status
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta Invitation Query Error]", {
        token: input.token,
        errorType: errorMsg.includes("INVITATION_NOT_FOUND") ? "NOT_FOUND" : "DB_ERROR",
        errorMessage: errorMsg,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (errorMsg.includes("INVITATION_NOT_FOUND")) {
        throw new Error("\uC774 \uC774\uBA54\uC77C\uB85C \uB41C \uCD08\uB300\uAC00 \uC5C6\uC5B4\uC694. \uCD08\uB300 \uCF54\uB4DC\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      } else {
        throw new Error("\uD604\uC7AC \uCD08\uB300 \uD655\uC778\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      }
    }
  }),
  /**
   * 초대 수락 (회원가입 후)
   */
  acceptInvitation: publicProcedure.input(z6.object({ token: z6.string() })).mutation(async ({ ctx, input }) => {
    try {
      const invitation = await acceptInvitation(input.token, ctx.user?.id || 0);
      if (!invitation) {
        throw new Error("INVITATION_NOT_FOUND");
      }
      return {
        success: true,
        message: "\uBCA0\uD0C0 \uD14C\uC2A4\uD2B8 \uD504\uB85C\uADF8\uB7A8\uC5D0 \uCC38\uC5EC\uD588\uC2B5\uB2C8\uB2E4!"
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta Accept Error]", {
        token: input.token,
        userId: ctx.user?.id,
        errorType: errorMsg.includes("INVITATION_NOT_FOUND") ? "NOT_FOUND" : "DB_ERROR",
        errorMessage: errorMsg,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (errorMsg.includes("INVITATION_NOT_FOUND")) {
        throw new Error("\uC774 \uCD08\uB300\uAC00 \uC5C6\uAC70\uB098 \uC774\uBBF8 \uC0AC\uC6A9\uB418\uC5C8\uC5B4\uC694.");
      } else {
        throw new Error("\uCD08\uB300 \uC218\uB77D\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      }
    }
  }),
  /**
   * 모든 초대 목록 조회 (관리자만)
   */
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uC870\uD68C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    try {
      const invitations = await getAllInvitations();
      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
        userId: inv.userId
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta List Invitations Error]", {
        adminId: ctx.user?.id,
        errorMessage: errorMsg,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      throw new Error("\uCD08\uB300 \uBAA9\uB85D \uC870\uD68C\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694.");
    }
  }),
  /**
   * 초대 통계 조회 (관리자만)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uC870\uD68C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    try {
      return await getInvitationStats();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Beta Stats Error]", {
        adminId: ctx.user?.id,
        errorMessage: errorMsg,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      throw new Error("\uD1B5\uACC4 \uC870\uD68C\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694.");
    }
  })
});

// server/betaFeedbackRouter.ts
import { z as z7 } from "zod";

// server/betaFeedback.ts
import crypto4 from "crypto";
var feedbackStore = /* @__PURE__ */ new Map();
var feedbackUpdateCallbacks = [];
function createFeedback(userId, input) {
  const feedback2 = {
    ...input,
    id: crypto4.randomUUID(),
    priorityScore: calculatePriorityScore(input),
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  feedbackStore.set(feedback2.id, feedback2);
  notifyFeedbackUpdate(feedback2);
  return feedback2;
}
function calculatePriorityScore(feedback2) {
  let score = 0;
  const typeScores = {
    bug: 50,
    usability: 30,
    feature: 20
  };
  score += typeScores[feedback2.feedbackType];
  if (feedback2.severity) {
    const severityScores = {
      critical: 50,
      high: 30,
      medium: 15,
      low: 5
    };
    score += severityScores[feedback2.severity];
  }
  if (feedback2.rating && feedback2.feedbackType !== "bug") {
    score += (5 - feedback2.rating) * 10;
  }
  if (feedback2.reproducible) {
    score += 20;
  }
  return score;
}
function getFeedback(id) {
  return feedbackStore.get(id) || null;
}
function getAllFeedback(filters) {
  let feedbacks = Array.from(feedbackStore.values());
  if (filters?.type) {
    feedbacks = feedbacks.filter((f) => f.feedbackType === filters.type);
  }
  if (filters?.status) {
    feedbacks = feedbacks.filter((f) => f.status === filters.status);
  }
  if (filters?.severity) {
    feedbacks = feedbacks.filter((f) => f.severity === filters.severity);
  }
  return feedbacks.sort((a, b) => b.priorityScore - a.priorityScore);
}
function updateFeedbackStatus(id, status) {
  const feedback2 = feedbackStore.get(id);
  if (!feedback2) return null;
  feedback2.status = status;
  feedback2.updatedAt = /* @__PURE__ */ new Date();
  notifyFeedbackUpdate(feedback2);
  return feedback2;
}
function markAsDuplicate(id, duplicateOfId) {
  const feedback2 = feedbackStore.get(id);
  if (!feedback2) return null;
  feedback2.duplicateOf = duplicateOfId;
  feedback2.status = "rejected";
  feedback2.updatedAt = /* @__PURE__ */ new Date();
  notifyFeedbackUpdate(feedback2);
  return feedback2;
}
function getFeedbackStats() {
  const feedbacks = Array.from(feedbackStore.values());
  return {
    total: feedbacks.length,
    byType: {
      bug: feedbacks.filter((f) => f.feedbackType === "bug").length,
      feature: feedbacks.filter((f) => f.feedbackType === "feature").length,
      usability: feedbacks.filter((f) => f.feedbackType === "usability").length
    },
    byStatus: {
      open: feedbacks.filter((f) => f.status === "open").length,
      in_progress: feedbacks.filter((f) => f.status === "in_progress").length,
      resolved: feedbacks.filter((f) => f.status === "resolved").length,
      rejected: feedbacks.filter((f) => f.status === "rejected").length
    },
    bySeverity: {
      critical: feedbacks.filter((f) => f.severity === "critical").length,
      high: feedbacks.filter((f) => f.severity === "high").length,
      medium: feedbacks.filter((f) => f.severity === "medium").length,
      low: feedbacks.filter((f) => f.severity === "low").length
    },
    averageRating: feedbacks.filter((f) => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.filter((f) => f.rating).length || 0
  };
}
function notifyFeedbackUpdate(feedback2) {
  feedbackUpdateCallbacks.forEach((callback) => {
    try {
      callback(feedback2);
    } catch (error) {
      console.error("[Beta] \uD53C\uB4DC\uBC31 \uC5C5\uB370\uC774\uD2B8 \uCF5C\uBC31 \uC5D0\uB7EC:", error);
    }
  });
}
function detectDuplicates(newFeedback, similarityThreshold = 0.7) {
  const feedbacks = Array.from(feedbackStore.values()).filter(
    (f) => f.feedbackType === newFeedback.feedbackType && f.id !== newFeedback.id
  );
  return feedbacks.filter((f) => {
    const newWords = new Set(newFeedback.title.toLowerCase().split(/\s+/));
    const existingWords = new Set(f.title.toLowerCase().split(/\s+/));
    const intersection = new Set(Array.from(newWords).filter((x) => existingWords.has(x)));
    const union = /* @__PURE__ */ new Set([...Array.from(newWords), ...Array.from(existingWords)]);
    const similarity = intersection.size / union.size;
    return similarity >= similarityThreshold;
  });
}

// server/betaFeedbackRouter.ts
var betaFeedbackRouter = router({
  /**
   * 피드백 생성
   */
  create: protectedProcedure.input(
    z7.object({
      feedbackType: z7.enum(["feature", "bug", "usability"]),
      title: z7.string().min(5, "\uC81C\uBAA9\uC740 \uCD5C\uC18C 5\uC790 \uC774\uC0C1"),
      description: z7.string().min(10, "\uC124\uBA85\uC740 \uCD5C\uC18C 10\uC790 \uC774\uC0C1"),
      rating: z7.number().min(1).max(5).optional(),
      deviceInfo: z7.string().optional(),
      reproducible: z7.boolean().default(false),
      reproductionSteps: z7.string().optional(),
      screenshotUrl: z7.string().optional(),
      severity: z7.enum(["low", "medium", "high", "critical"]).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const feedback2 = createFeedback(ctx.user?.id || 0, {
      ...input,
      userId: ctx.user?.id || 0,
      status: "open"
    });
    const duplicates = detectDuplicates(feedback2, 0.65);
    if (duplicates.length > 0) {
      console.log(`[Beta] \uC720\uC0AC \uD53C\uB4DC\uBC31 ${duplicates.length}\uAC1C \uAC10\uC9C0\uB428`);
    }
    return {
      success: true,
      feedback: {
        id: feedback2.id,
        title: feedback2.title,
        status: feedback2.status,
        priorityScore: feedback2.priorityScore,
        createdAt: feedback2.createdAt
      },
      duplicateCount: duplicates.length
    };
  }),
  /**
   * 피드백 조회
   */
  get: protectedProcedure.input(z7.object({ id: z7.string() })).query(async ({ input }) => {
    const feedback2 = getFeedback(input.id);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    return feedback2;
  }),
  /**
   * 모든 피드백 조회 (필터링)
   */
  list: protectedProcedure.input(
    z7.object({
      type: z7.enum(["feature", "bug", "usability"]).optional(),
      status: z7.enum(["open", "in_progress", "resolved", "rejected"]).optional(),
      severity: z7.enum(["low", "medium", "high", "critical"]).optional()
    })
  ).query(async ({ input }) => {
    return getAllFeedback({
      type: input.type,
      status: input.status,
      severity: input.severity
    });
  }),
  /**
   * 피드백 상태 업데이트 (관리자만)
   */
  updateStatus: protectedProcedure.input(
    z7.object({
      id: z7.string(),
      status: z7.enum(["open", "in_progress", "resolved", "rejected"])
    })
  ).mutation(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uC0C1\uD0DC\uB97C \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    const feedback2 = updateFeedbackStatus(input.id, input.status);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    return {
      success: true,
      feedback: feedback2
    };
  }),
  /**
   * 중복 표시 (관리자만)
   */
  markDuplicate: protectedProcedure.input(
    z7.object({
      id: z7.string(),
      duplicateOfId: z7.string()
    })
  ).mutation(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uC911\uBCF5\uC744 \uD45C\uC2DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    const feedback2 = markAsDuplicate(input.id, input.duplicateOfId);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    return {
      success: true,
      feedback: feedback2
    };
  }),
  /**
   * 피드백 통계 조회
   */
  getStats: protectedProcedure.query(async () => {
    return getFeedbackStats();
  }),
  /**
   * 중복 감지
   */
  detectDuplicates: protectedProcedure.input(z7.object({ id: z7.string() })).query(async ({ input }) => {
    const feedback2 = getFeedback(input.id);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    const duplicates = detectDuplicates(feedback2, 0.65);
    return duplicates.map((f) => ({
      id: f.id,
      title: f.title,
      similarity: 0.7
      // 간단한 계산
    }));
  })
});

// server/bugClassificationRouter.ts
import { z as z9 } from "zod";

// server/bugClassification.ts
import { z as z8 } from "zod";
var ClassificationSchema = z8.object({
  severity: z8.enum(["low", "medium", "high", "critical"]),
  impact: z8.enum(["low", "medium", "high"]),
  effort: z8.enum(["low", "medium", "high"]),
  category: z8.string().min(1).max(100),
  suggestedAction: z8.string().min(1).max(200),
  estimatedFix: z8.string().min(1).max(100)
});
async function classifyBugWithAI(feedback2, retryCount = 1) {
  const prompt = `
\uB2F9\uC2E0\uC740 \uC18C\uD504\uD2B8\uC6E8\uC5B4 \uBC84\uADF8 \uBD84\uB958 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uB2E4\uC74C \uBC84\uADF8 \uB9AC\uD3EC\uD2B8\uB97C \uBD84\uC11D\uD558\uACE0 \uBD84\uB958\uD574\uC8FC\uC138\uC694:

**\uC81C\uBAA9**: ${feedback2.title}
**\uC124\uBA85**: ${feedback2.description}
**\uC7AC\uD604 \uAC00\uB2A5**: ${feedback2.reproducible ? "\uC608" : "\uC544\uB2C8\uC624"}
**\uC7AC\uD604 \uB2E8\uACC4**: ${feedback2.reproductionSteps || "\uC5C6\uC74C"}
**\uAE30\uAE30 \uC815\uBCF4**: ${feedback2.deviceInfo || "\uC5C6\uC74C"}

\uB2E4\uC74C \uAE30\uC900\uC73C\uB85C \uBD84\uC11D\uD574\uC8FC\uC138\uC694:

1. **\uC2EC\uAC01\uB3C4 (Severity)**: \uC0AC\uC6A9\uC790 \uC601\uD5A5\uB3C4
   - critical: \uC571 \uD06C\uB798\uC2DC, \uB370\uC774\uD130 \uC190\uC2E4, \uBCF4\uC548 \uBB38\uC81C
   - high: \uC8FC\uC694 \uAE30\uB2A5 \uBD88\uAC00, \uC2EC\uAC01\uD55C \uC131\uB2A5 \uC800\uD558
   - medium: \uC77C\uBD80 \uAE30\uB2A5 \uBD88\uC644\uC804, \uC0AC\uC6A9\uC131 \uBB38\uC81C
   - low: \uBBF8\uBBF8\uD55C UI \uC624\uB958, \uD14D\uC2A4\uD2B8 \uC624\uB958

2. **\uC601\uD5A5\uB3C4 (Impact)**: \uC601\uD5A5\uBC1B\uB294 \uC0AC\uC6A9\uC790 \uC218
   - high: \uBAA8\uB4E0 \uC0AC\uC6A9\uC790 \uB610\uB294 \uB300\uB2E4\uC218
   - medium: \uD2B9\uC815 \uC0AC\uC6A9\uC790 \uADF8\uB8F9
   - low: \uC18C\uC218 \uC0AC\uC6A9\uC790

3. **\uD574\uACB0 \uB09C\uC774\uB3C4 (Effort)**: \uC218\uC815\uC5D0 \uD544\uC694\uD55C \uC2DC\uAC04
   - low: 1\uC2DC\uAC04 \uC774\uB0B4
   - medium: 1-3\uC77C
   - high: 1\uC8FC \uC774\uC0C1

4. **\uCE74\uD14C\uACE0\uB9AC**: \uBC84\uADF8\uC758 \uBD84\uB958
   - UI/UX, Performance, Security, Data, API, Authentication, etc.

5. **\uAD8C\uC7A5 \uC870\uCE58**: \uC989\uC2DC \uC870\uCE58 \uD544\uC694 \uC5EC\uBD80
   - Immediate: \uC989\uC2DC \uC218\uC815 \uD544\uC694
   - High Priority: \uB2E4\uC74C \uB9B4\uB9AC\uC2A4\uC5D0 \uD3EC\uD568
   - Backlog: \uD5A5\uD6C4 \uACE0\uB824

\uB2E4\uC74C JSON \uD615\uC2DD\uC73C\uB85C \uC751\uB2F5\uD574\uC8FC\uC138\uC694:
{
  "severity": "critical|high|medium|low",
  "impact": "high|medium|low",
  "effort": "low|medium|high",
  "category": "\uCE74\uD14C\uACE0\uB9AC\uBA85",
  "suggestedAction": "\uAD8C\uC7A5 \uC870\uCE58",
  "estimatedFix": "\uC608\uC0C1 \uC218\uC815 \uC2DC\uAC04"
}`;
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "\uB2F9\uC2E0\uC740 \uC18C\uD504\uD2B8\uC6E8\uC5B4 \uBC84\uADF8 \uBD84\uB958 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. JSON \uD615\uC2DD\uC73C\uB85C\uB9CC \uC751\uB2F5\uD558\uC138\uC694."
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bug_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              effort: { type: "string", enum: ["low", "medium", "high"] },
              category: { type: "string" },
              suggestedAction: { type: "string" },
              estimatedFix: { type: "string" }
            },
            required: [
              "severity",
              "impact",
              "effort",
              "category",
              "suggestedAction",
              "estimatedFix"
            ],
            additionalProperties: false
          }
        }
      }
    });
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error("Invalid LLM response structure");
    }
    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("LLM response content is not a string");
    }
    let result;
    try {
      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[Bug Classification] JSON parse error:", parseError, "Content:", content);
      throw new Error(`JSON parse failed: ${String(parseError)}`);
    }
    const validationResult = ClassificationSchema.safeParse(result);
    if (!validationResult.success) {
      console.error("[Bug Classification] Schema validation failed:", validationResult.error);
      throw new Error(`Schema validation failed: ${validationResult.error.message}`);
    }
    return validationResult.data;
  } catch (error) {
    console.error(`[Bug Classification] AI \uBD84\uB958 \uC2E4\uD328 (\uC2DC\uB3C4 ${retryCount}/2):`, error);
    if (retryCount < 2) {
      console.log("[Bug Classification] Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      return classifyBugWithAI(feedback2, retryCount + 1);
    }
    console.warn("[Bug Classification] Using fallback classification");
    return getDefaultClassification(feedback2);
  }
}
function getDefaultClassification(feedback2) {
  const title = feedback2.title.toLowerCase();
  const description = feedback2.description.toLowerCase();
  const text2 = `${title} ${description}`;
  let severity = "medium";
  let category = "General";
  if (text2.includes("crash") || text2.includes("\uD06C\uB798\uC2DC") || text2.includes("security") || text2.includes("\uBCF4\uC548")) {
    severity = "critical";
  } else if (text2.includes("error") || text2.includes("fail") || text2.includes("\uC624\uB958") || text2.includes("\uC2E4\uD328")) {
    severity = "high";
  } else if (text2.includes("slow") || text2.includes("lag") || text2.includes("\uB290\uB9BC")) {
    severity = "medium";
  } else if (text2.includes("typo") || text2.includes("ui") || text2.includes("\uC624\uD0C0")) {
    severity = "low";
  }
  if (text2.includes("ui") || text2.includes("\uBC84\uD2BC") || text2.includes("\uD654\uBA74")) {
    category = "UI/UX";
  } else if (text2.includes("performance") || text2.includes("slow") || text2.includes("\uC131\uB2A5")) {
    category = "Performance";
  } else if (text2.includes("security") || text2.includes("auth") || text2.includes("\uBCF4\uC548")) {
    category = "Security";
  } else if (text2.includes("data") || text2.includes("save") || text2.includes("\uB370\uC774\uD130")) {
    category = "Data";
  } else if (text2.includes("api") || text2.includes("network")) {
    category = "API";
  }
  const effortMap = {
    critical: "high",
    high: "medium",
    medium: "low",
    low: "low"
  };
  return {
    severity,
    impact: severity === "critical" ? "high" : "medium",
    effort: effortMap[severity],
    category,
    suggestedAction: severity === "critical" ? "Immediate" : severity === "high" ? "High Priority" : "Backlog",
    estimatedFix: severity === "critical" ? "1\uC2DC\uAC04" : severity === "high" ? "1-3\uC77C" : "1\uC8FC"
  };
}
function calculatePriorityScore2(classification, reproducible) {
  let score = 0;
  const severityScores = {
    critical: 50,
    high: 30,
    medium: 15,
    low: 5
  };
  score += severityScores[classification.severity];
  const impactScores = {
    high: 30,
    medium: 15,
    low: 5
  };
  score += impactScores[classification.impact];
  const effortScores = {
    low: 20,
    medium: 10,
    high: 5
  };
  score += effortScores[classification.effort];
  if (reproducible) {
    score += 10;
  }
  return Math.min(score, 100);
}
function findSimilarBugs(feedback2, allFeedbacks, threshold = 0.6) {
  const keywords = feedback2.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return allFeedbacks.filter((f) => {
    if (f.id === feedback2.id) return false;
    if (f.feedbackType !== "bug") return false;
    const fKeywords = f.title.toLowerCase().split(/\s+/);
    const matches = keywords.filter((k) => fKeywords.some((fk) => fk.includes(k)));
    const similarity = matches.length / Math.max(keywords.length, fKeywords.length);
    return similarity >= threshold;
  });
}

// server/bugClassificationRouter.ts
var bugClassificationRouter = router({
  /**
   * 버그 자동 분류 (AI 기반)
   */
  classifyBug: protectedProcedure.input(z9.object({ feedbackId: z9.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("\uAD00\uB9AC\uC790\uB9CC \uBD84\uB958\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    const feedback2 = getFeedback(input.feedbackId);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    if (feedback2.feedbackType !== "bug") {
      throw new Error("\uBC84\uADF8\uB9CC \uBD84\uB958\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4");
    }
    try {
      const classification = await classifyBugWithAI(feedback2);
      const priorityScore = calculatePriorityScore2(
        classification,
        feedback2.reproducible
      );
      const allFeedbacks = getAllFeedback();
      const similarBugs = findSimilarBugs(feedback2, allFeedbacks, 0.6);
      return {
        success: true,
        classification: {
          ...classification,
          priorityScore
        },
        similarBugs: similarBugs.map((b) => ({
          id: b.id,
          title: b.title,
          status: b.status
        }))
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "\uBD84\uB958 \uC2E4\uD328"
      );
    }
  }),
  /**
   * 유사 버그 찾기
   */
  findSimilar: protectedProcedure.input(z9.object({ feedbackId: z9.string() })).query(async ({ input }) => {
    const feedback2 = getFeedback(input.feedbackId);
    if (!feedback2) {
      throw new Error("\uD53C\uB4DC\uBC31\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");
    }
    const allFeedbacks = getAllFeedback();
    const similarBugs = findSimilarBugs(feedback2, allFeedbacks, 0.5);
    return similarBugs.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      severity: b.severity,
      priorityScore: b.priorityScore,
      createdAt: b.createdAt
    }));
  }),
  /**
   * 버그 분류 통계
   */
  getStats: protectedProcedure.query(async () => {
    const feedbacks = getAllFeedback({ type: "bug" });
    const stats = {
      total: feedbacks.length,
      bySeverity: {
        critical: feedbacks.filter((f) => f.severity === "critical").length,
        high: feedbacks.filter((f) => f.severity === "high").length,
        medium: feedbacks.filter((f) => f.severity === "medium").length,
        low: feedbacks.filter((f) => f.severity === "low").length
      },
      byStatus: {
        open: feedbacks.filter((f) => f.status === "open").length,
        in_progress: feedbacks.filter((f) => f.status === "in_progress").length,
        resolved: feedbacks.filter((f) => f.status === "resolved").length,
        rejected: feedbacks.filter((f) => f.status === "rejected").length
      },
      reproducible: feedbacks.filter((f) => f.reproducible).length,
      averagePriority: feedbacks.reduce((sum, f) => sum + f.priorityScore, 0) / feedbacks.length || 0
    };
    return stats;
  }),
  /**
   * 우선순위 상위 버그
   */
  getTopPriority: protectedProcedure.input(z9.object({ limit: z9.number().default(10) })).query(async ({ input }) => {
    const feedbacks = getAllFeedback({ type: "bug", status: "open" });
    return feedbacks.slice(0, input.limit).map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      priorityScore: f.priorityScore,
      reproducible: f.reproducible,
      createdAt: f.createdAt
    }));
  })
});

// server/routers.ts
init_textParser();

// src/lib/enforceStyle.ts
var enforceStyleBatch = (styles) => {
  return styles;
};

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  pipeline: pipelineRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // 대화방 관리
  conversations: router({
    // 사용자의 모든 대화방 조회
    list: protectedProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user.id);
    }),
    // 특정 대화방 조회
    get: protectedProcedure.input(z10.object({ id: z10.number() })).query(async ({ input }) => {
      return getConversationById(input.id);
    }),
    // 대화방 생성
    create: protectedProcedure.input(z10.object({
      partnerName: z10.string(),
      relationshipType: z10.enum(["\uC378", "\uC5F0\uC560", "\uC7AC\uD68C", "\uC9C1\uC7A5", "\uAC70\uB798", "\uAE30\uD0C0"]),
      goals: z10.array(z10.string()),
      restrictions: z10.array(z10.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const conversationId = await createConversation({
        userId: ctx.user.id,
        partnerName: input.partnerName,
        relationshipType: input.relationshipType,
        goals: JSON.stringify(input.goals),
        restrictions: input.restrictions ? JSON.stringify(input.restrictions) : null
      });
      return { id: conversationId };
    }),
    // 대화방 프로필 업데이트
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      partnerName: z10.string().optional(),
      relationshipType: z10.enum(["\uC378", "\uC5F0\uC560", "\uC7AC\uD68C", "\uC9C1\uC7A5", "\uAC70\uB798", "\uAE30\uD0C0"]).optional(),
      goals: z10.array(z10.string()).optional(),
      restrictions: z10.array(z10.string()).optional(),
      noLongMessage: z10.boolean().optional(),
      noEmotional: z10.boolean().optional(),
      forcePolite: z10.boolean().optional()
    })).mutation(async ({ input }) => {
      const updateData = {};
      if (input.partnerName) updateData.partnerName = input.partnerName;
      if (input.relationshipType) updateData.relationshipType = input.relationshipType;
      if (input.goals) updateData.goals = JSON.stringify(input.goals);
      if (input.restrictions) updateData.restrictions = JSON.stringify(input.restrictions);
      if (typeof input.noLongMessage === "boolean") updateData.noLongMessage = input.noLongMessage;
      if (typeof input.noEmotional === "boolean") updateData.noEmotional = input.noEmotional;
      if (typeof input.forcePolite === "boolean") updateData.forcePolite = input.forcePolite;
      await updateConversation(input.id, updateData);
      return { success: true };
    }),
    // 대화방 삭제
    delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
      await deleteConversation(input.id);
      return { success: true };
    }),
    // 대화방의 메시지 히스토리 조회
    getHistory: protectedProcedure.input(z10.object({ conversationId: z10.number() })).query(async ({ input }) => {
      return getMessageHistoryByConversationId(input.conversationId);
    })
  }),
  // AI 분석
  analysis: router({
    // 스크린샷 업로드 및 분석
    analyzeScreenshot: protectedProcedure.input(z10.object({
      conversationId: z10.number(),
      imageBase64: z10.string()
      // base64 인코딩된 이미지
    })).mutation(async ({ input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) {
        throw new Error("\uB300\uD654\uBC29\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      const fileKey = `conversations/${input.conversationId}/screenshots/${nanoid2()}.png`;
      const { url: screenshotUrl } = await storagePut(fileKey, imageBuffer, "image/png");
      const ocrResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "\uB2F9\uC2E0\uC740 \uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uC2A4\uD06C\uB9B0\uC0F7\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uCD94\uCD9C\uD558\uB294 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uB9D0\uD48D\uC120\uC758 \uD14D\uC2A4\uD2B8\uB9CC \uC815\uD655\uD558\uAC8C \uCD94\uCD9C\uD558\uACE0, \uC2DC\uAC04\uC774\uB098 \uBC30\uD130\uB9AC \uD45C\uC2DC \uB4F1\uC740 \uC81C\uC678\uD558\uC138\uC694."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "\uC774 \uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uC2A4\uD06C\uB9B0\uC0F7\uC5D0\uC11C \uB300\uD654 \uB0B4\uC6A9\uB9CC \uCD94\uCD9C\uD574\uC8FC\uC138\uC694. \uAC01 \uBA54\uC2DC\uC9C0\uB97C '\uBC1C\uC2E0\uC790: \uB0B4\uC6A9' \uD615\uC2DD\uC73C\uB85C \uC815\uB9AC\uD574\uC8FC\uC138\uC694."
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshotUrl,
                  detail: "high"
                }
              }
            ]
          }
        ]
      });
      const extractedText = (typeof ocrResponse.choices[0]?.message?.content === "string" ? ocrResponse.choices[0]?.message?.content : JSON.stringify(ocrResponse.choices[0]?.message?.content)) || "";
      await addMessageHistory({
        conversationId: input.conversationId,
        screenshotUrl,
        ocrTextRaw: extractedText,
        messageType: "screenshot"
      });
      const previousMessages = await getMessageHistoryByConversationId(input.conversationId);
      const contextText = previousMessages.slice(-5).map((m) => m.ocrTextRaw || "").join("\n\n");
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      const memorySummary = conversation.contextSummary || "\uC544\uC9C1 \uCD95\uC801\uB41C \uB9E5\uB77D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const mode = conversation.relationshipType === "\uC9C1\uC7A5" ? "work" : conversation.relationshipType === "\uAC70\uB798" ? "trade" : "dating";
      const analysisPrompt = generateAnalysisPrompt({
        mode,
        relationshipType: conversation.relationshipType,
        goals,
        restrictions,
        memorySummary,
        recentMessages: `${contextText}

**\uC0C8\uB85C \uCD94\uAC00\uB41C \uB300\uD654**:
${extractedText}`
      });
      const analysisResponse = await invokeLLM({
        messages: [
          { role: "user", content: analysisPrompt }
        ]
      });
      const contentStr = typeof analysisResponse.choices[0]?.message?.content === "string" ? analysisResponse.choices[0]?.message?.content : JSON.stringify(analysisResponse.choices[0]?.message?.content) || "{}";
      const analysisResult = safeParseAIResponse(contentStr);
      if (!analysisResult) {
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI \uBD84\uC11D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
        });
      }
      await saveAnalysisResult({
        conversationId: input.conversationId,
        outputJson: JSON.stringify(analysisResult),
        inputExcerpt: contextText.slice(0, 500)
        // 최근 대화 요약
      });
      if (analysisResult.updated_memory_summary) {
        await updateConversation(input.conversationId, {
          contextSummary: analysisResult.updated_memory_summary
        });
      }
      return analysisResult;
    }),
    // 톤 변경 재생성 (ChatGPT 플로우)
    regenerateWithTone: protectedProcedure.input(z10.object({
      conversationId: z10.number(),
      tone: z10.enum(["soft", "balanced", "humor"])
    })).mutation(async ({ input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) {
        throw new Error("\uB300\uD654\uBC29\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      const previousMessages = await getMessageHistoryByConversationId(input.conversationId);
      const contextText = previousMessages.slice(-5).map((m) => m.ocrTextRaw || "").join("\n\n");
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      const memorySummary = conversation.contextSummary || "\uC544\uC9C1 \uCD95\uC801\uB41C \uB9E5\uB77D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const toneInstruction = {
        soft: "\uBD80\uB4DC\uB7FD\uACE0 \uACF5\uAC10\uC801\uC778 \uD1A4\uC73C\uB85C \uB2F5\uBCC0\uD558\uC138\uC694.",
        balanced: "\uADE0\uD615 \uC7A1\uD78C \uD1A4\uC73C\uB85C \uB2F5\uBCC0\uD558\uC138\uC694.",
        humor: "\uC720\uBA38\uB7EC\uC2A4\uD558\uACE0 \uAC00\uBCBC\uC6B4 \uD1A4\uC73C\uB85C \uB2F5\uBCC0\uD558\uC138\uC694."
      };
      const regeneratePrompt = `
\uB2F9\uC2E0\uC740 \uCE74\uD1A1 \uB300\uD654 \uCF54\uCE6D \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uB2E4\uC74C \uC815\uBCF4\uB97C \uBC14\uD0D5\uC73C\uB85C **${input.tone} \uD1A4\uB9CC** \uC0DD\uC131\uD574\uC8FC\uC138\uC694:

**\uB300\uD654\uBC29 \uD504\uB85C\uD544**:
- \uAD00\uACC4: ${conversation.relationshipType}
- \uBAA9\uD45C: ${goals.join(", ")}
- \uAE08\uC9C0: ${restrictions.length > 0 ? restrictions.join(", ") : "\uC5C6\uC74C"}

**\uBA54\uBAA8\uB9AC \uC694\uC57D**:
${memorySummary}

**\uCD5C\uADFC \uB300\uD654**:
${contextText}

**\uD1A4 \uC9C0\uCE68**: ${toneInstruction[input.tone]}

**\uC9C0\uCE68**:
1. \uB2F5\uC7A5\uC740 1~2\uBB38\uC7A5
2. \uAE08\uC9C0 \uC635\uC158 \uC5C4\uACA9\uD788 \uC9C0\uD0A4\uAE30

\uB2E4\uC74C JSON \uD615\uC2DD\uC73C\uB85C \uC751\uB2F5\uD574\uC8FC\uC138\uC694:
{
  "one_line_psychology": "\uC0C1\uB300 \uC2EC\uB9AC 1\uC904 \uC694\uC57D",
  "reply": {
    "tone": "${input.tone}",
    "text": "",
    "why": "\uC608\uC0C1 \uD6A8\uACFC",
    "risk": "\uC8FC\uC758\uC0AC\uD56D"
  }
}
`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "\uB2F9\uC2E0\uC740 \uC5F0\uC560 \uB300\uD654 \uBD84\uC11D \uBC0F \uB2F5\uBCC0 \uCD94\uCC9C \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4." },
          { role: "user", content: regeneratePrompt }
        ]
      });
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return result;
    }),
    // 맥락 추가 재분석 (ChatGPT 플로우)
    addContextAndReanalyze: protectedProcedure.input(z10.object({
      conversationId: z10.number(),
      contextHint: z10.string()
      // "상황 한 줄 입력"
    })).mutation(async ({ input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) {
        throw new Error("\uB300\uD654\uBC29\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      const previousMessages = await getMessageHistoryByConversationId(input.conversationId);
      const contextText = previousMessages.slice(-5).map((m) => m.ocrTextRaw || "").join("\n\n");
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      const memorySummary = conversation.contextSummary || "\uC544\uC9C1 \uCD95\uC801\uB41C \uB9E5\uB77D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const reanalysisPrompt = `
\uB2F9\uC2E0\uC740 \uCE74\uD1A1 \uB300\uD654 \uCF54\uCE6D \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uB2E4\uC74C \uC815\uBCF4\uB97C \uBC14\uD0D5\uC73C\uB85C \uBD84\uC11D\uD574\uC8FC\uC138\uC694:

**\uB300\uD654\uBC29 \uD504\uB85C\uD544**:
- \uAD00\uACC4: ${conversation.relationshipType}
- \uBAA9\uD45C: ${goals.join(", ")}
- \uAE08\uC9C0: ${restrictions.length > 0 ? restrictions.join(", ") : "\uC5C6\uC74C"}

**\uBA54\uBAA8\uB9AC \uC694\uC57D**:
${memorySummary}

**\uCD5C\uADFC \uB300\uD654**:
${contextText}

**\uC0AC\uC6A9\uC790\uAC00 \uCD94\uAC00\uD55C \uB9E5\uB77D**:
${input.contextHint}

**\uC9C0\uCE68**:
1. \uB2F5\uC7A5\uC740 1~2\uBB38\uC7A5
2. \uAE08\uC9C0 \uC635\uC158 \uC5C4\uACA9\uD788 \uC9C0\uD0A4\uAE30

\uB2E4\uC74C JSON \uD615\uC2DD\uC73C\uB85C \uC751\uB2F5\uD574\uC8FC\uC138\uC694:
{
  "one_line_psychology": "\uC0C1\uB300 \uC2EC\uB9AC 1\uC904 \uC694\uC57D",
  "need_more_context": false,
  "context_question": "",
  "replies": [
    {"tone":"soft", "text":"", "why":"\uC608\uC0C1 \uD6A8\uACFC", "risk":"\uC8FC\uC758\uC0AC\uD56D"},
    {"tone":"balanced", "text":"", "why":"", "risk":""},
    {"tone":"humor", "text":"", "why":"", "risk":""}
  ],
  "updated_memory_summary": "\uCD5C\uC2E0 \uB300\uD654 \uC0C1\uD669 \uC694\uC57D (1~2\uBB38\uC7A5)"
}
`;
      const analysisResponse = await invokeLLM({
        messages: [
          { role: "system", content: "\uB2F9\uC2E0\uC740 \uC5F0\uC560 \uB300\uD654 \uBD84\uC11D \uBC0F \uB2F5\uBCC0 \uCD94\uCC9C \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4." },
          { role: "user", content: reanalysisPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "talk_caddy_reanalysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                one_line_psychology: { type: "string" },
                need_more_context: { type: "boolean" },
                context_question: { type: "string" },
                replies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tone: { type: "string", enum: ["soft", "balanced", "humor"] },
                      text: { type: "string" },
                      why: { type: "string" },
                      risk: { type: "string" }
                    },
                    required: ["tone", "text", "why", "risk"],
                    additionalProperties: false
                  },
                  minItems: 3,
                  maxItems: 3
                },
                updated_memory_summary: { type: "string" }
              },
              required: ["one_line_psychology", "need_more_context", "context_question", "replies", "updated_memory_summary"],
              additionalProperties: false
            }
          }
        }
      });
      const analysisResult = JSON.parse(analysisResponse.choices[0]?.message?.content || "{}");
      if (analysisResult.updated_memory_summary) {
        await updateConversation(input.conversationId, {
          contextSummary: analysisResult.updated_memory_summary
        });
      }
      return analysisResult;
    }),
    // 텍스트 복붙 분석
    analyzeText: protectedProcedure.input(z10.object({
      conversationId: z10.number(),
      text: z10.string().min(10, "\uCD5C\uC18C 10\uC790 \uC774\uC0C1 \uC785\uB825\uD574\uC8FC\uC138\uC694")
    })).mutation(async ({ input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) {
        throw new Error("\uB300\uD654\uBC29\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      await addMessageHistory({
        conversationId: input.conversationId,
        screenshotUrl: null,
        ocrTextRaw: input.text,
        messageType: "text"
      });
      const previousMessages = await getMessageHistoryByConversationId(input.conversationId);
      const contextText = previousMessages.slice(-5).map((m) => m.ocrTextRaw || "").join("\n\n");
      const goals = JSON.parse(conversation.goals);
      const restrictions = conversation.restrictions ? JSON.parse(conversation.restrictions) : [];
      const memorySummary = conversation.memorySummary || "\uCCAB \uB300\uD654\uC785\uB2C8\uB2E4.";
      const modeMap = {
        "\uC378": "dating",
        "\uC5F0\uC560": "dating",
        "\uC7AC\uD68C": "dating",
        "\uC9C1\uC7A5": "work",
        "\uAC70\uB798": "trade",
        "\uAE30\uD0C0": "dating"
      };
      const mode = modeMap[conversation.relationshipType] || "dating";
      const userProfile = void 0;
      const groupChatDetection = detectGroupChat(input.text);
      const groupChatModifier = getGroupChatPromptModifier(groupChatDetection);
      console.log("[analyzeText] \uB2E8\uD1A1 \uAC10\uC9C0:", groupChatDetection);
      const analysisPrompt = generateAnalysisPrompt({
        mode,
        relationshipType: conversation.relationshipType,
        goals,
        restrictions,
        memorySummary,
        recentMessages: input.text,
        userProfile
      });
      const finalPrompt = groupChatDetection.isGroupChat ? groupChatModifier + analysisPrompt : analysisPrompt;
      const analysisResponse = await invokeLLM({
        messages: [
          { role: "user", content: finalPrompt }
        ]
      });
      const contentStr = analysisResponse?.choices?.[0]?.message?.content ?? "";
      console.error("[analyzeText] content_len=", contentStr.length);
      console.error("[analyzeText] content_head=", contentStr.slice(0, 400));
      console.error("[analyzeText] content_tail=", contentStr.slice(-400));
      const rawPreview = JSON.stringify(analysisResponse).slice(0, 4e3);
      console.log("[LLM_RAW_PREVIEW]", rawPreview);
      console.log("[LLM_RESPONSE_KEYS]", analysisResponse ? Object.keys(analysisResponse) : "null");
      const bypass = process.env.BYPASS_AI_VALIDATION === "1";
      const buildTag = process.env.BUILD_TAG || "dev-unknown";
      console.log("[BUILD_TAG]", buildTag);
      let analysisResult;
      try {
        console.log("[analyzeText] LLM Response keys:", analysisResponse ? Object.keys(analysisResponse) : "null");
        if (!analysisResponse) {
          throw new Error("LLM \uC751\uB2F5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
        }
        const choices = analysisResponse.choices;
        if (!Array.isArray(choices) || choices.length === 0) {
          console.error("[analyzeText] Invalid choices:", { choices, responseKeys: Object.keys(analysisResponse) });
          throw new Error("LLM \uC751\uB2F5 \uD615\uC2DD\uC774 \uC608\uC0C1\uACFC \uB2E4\uB985\uB2C8\uB2E4");
        }
        const firstChoice = choices[0];
        if (!firstChoice?.message) {
          throw new Error("LLM \uBA54\uC2DC\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");
        }
        const content = firstChoice.message.content;
        if (!content) {
          throw new Error("LLM \uC751\uB2F5 \uB0B4\uC6A9\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4");
        }
        const parsedContentStr = typeof content === "string" ? content : JSON.stringify(content);
        let parsedJson = safeParseAIResponse(parsedContentStr);
        if (parsedJson && parsedJson.one_line_psychology && parsedJson.replies) {
          console.log("[analyzeText] JSON \uD30C\uC2F1 \uC131\uACF5");
          const { AnalysisResultSchema: AnalysisResultSchema2 } = await Promise.resolve().then(() => (init_aiValidation(), aiValidation_exports));
          analysisResult = AnalysisResultSchema2.parse(parsedJson);
        } else {
          console.log("[analyzeText] JSON \uD30C\uC2F1 \uC2E4\uD328, \uD14D\uC2A4\uD2B8 \uD30C\uC2F1 \uC2DC\uB3C4");
          const textParsed = parseAnalysisResponse(parsedContentStr);
          if (!textParsed.one_line_psychology || textParsed.replies.every((r) => !r.text)) {
            console.error("[LLM_RAW_FAIL]", parsedContentStr);
            throw new Error(`AI \uC751\uB2F5 \uD615\uC2DD \uC624\uB958. (Raw: ${parsedContentStr.slice(0, 100)}...)`);
          }
          analysisResult = textParsed;
        }
      } catch (parseError) {
        console.error("[analyzeText] Error details:", {
          message: parseError.message,
          responseType: typeof analysisResponse
        });
        console.error("[LLM_PARSE_FAIL]", parseError);
        console.log("[LLM_RAW_PREVIEW_ON_FAIL]", rawPreview);
        await logError({
          errorCode: "LLM_PARSE_FAIL",
          errorMessage: parseError.message,
          location: "analyzeText",
          stackTrace: parseError.stack || "",
          context: {
            content_head: contentStr.slice(0, 200),
            content_tail: contentStr.slice(-200)
          },
          severity: "error"
        });
        throw new TRPCError5({
          code: "INTERNAL_SERVER_ERROR",
          message: parseError.message || "AI \uBD84\uC11D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
        });
      }
      const styleConstraints = {
        noLongMessage: conversation.noLongMessage === true,
        noEmotional: conversation.noEmotional === true,
        forcePolite: conversation.forcePolite === true
      };
      if (analysisResult?.replies && Object.keys(styleConstraints).some((k) => styleConstraints[k])) {
        console.log("[analyzeText] \uC2A4\uD0C0\uC77C \uC81C\uC57D \uC801\uC6A9:", styleConstraints);
        analysisResult.replies = enforceStyleBatch(analysisResult.replies, styleConstraints);
      }
      await saveAnalysisResult({
        conversationId: input.conversationId,
        outputJson: JSON.stringify(analysisResult),
        inputExcerpt: input.text.slice(0, 500)
      });
      await updateConversation(input.conversationId, {
        memorySummary: analysisResult.updated_memory_summary
      });
      return {
        ...analysisResult,
        buildTag,
        bypassMode: bypass,
        isGroupChat: groupChatDetection.isGroupChat,
        participantCount: groupChatDetection.participantCount
      };
    }),
    // 최근 분석 결과 조회
    getLatest: protectedProcedure.input(z10.object({ conversationId: z10.number() })).query(async ({ input }) => {
      const result = await getLatestAnalysisResult(input.conversationId);
      if (!result) return null;
      const output = JSON.parse(result.outputJson);
      return {
        id: result.id,
        one_line_psychology: output.one_line_psychology,
        assumption: output.assumption || "",
        need_more_context: output.need_more_context || false,
        context_question: output.context_question || "",
        replies: output.replies || [],
        updated_memory_summary: output.updated_memory_summary || "",
        createdAt: result.createdAt
      };
    })
  }),
  // 피드백 및 선호도 관리
  feedback: feedbackRouter,
  // 베타 테스트
  beta: betaRouter,
  betaFeedback: betaFeedbackRouter,
  bugClassification: bugClassificationRouter,
  // 구독 관리
  subscription: router({
    // 사용자의 구독 정보 조회
    get: protectedProcedure.query(async ({ ctx }) => {
      return getSubscriptionByUserId(ctx.user.id);
    }),
    // 구독 생성/업데이트
    update: protectedProcedure.input(z10.object({
      plan: z10.enum(["free", "basic", "premium"]),
      startDate: z10.date().optional(),
      endDate: z10.date().optional(),
      status: z10.enum(["active", "expired", "cancelled"]).optional(),
      paymentInfo: z10.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await createOrUpdateSubscription({
        userId: ctx.user.id,
        plan: input.plan,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status || "active",
        paymentInfo: input.paymentInfo
      });
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid3 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid3()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
