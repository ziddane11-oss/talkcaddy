import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, smallint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 대화방 테이블 - 사용자별 카톡 대화방 관리
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 대화 상대방 이름 또는 별칭 */
  partnerName: varchar("partnerName", { length: 100 }).notNull(),
  /** 관계 유형: 썸, 연애, 재회, 직장, 거래, 기타 */
  relationshipType: mysqlEnum("relationshipType", ["썸", "연애", "재회", "직장", "거래", "기타"]).notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * 업로드 테이블 - 파이프라인 단계화를 위한 업로드 상태 관리
 */
export const uploads = mysqlTable("uploads", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

/**
 * 메시지 히스토리 테이블 - 대화방별 업로드된 스크린샷 및 추출된 텍스트
 */
export const messageHistory = mysqlTable("messageHistory", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MessageHistory = typeof messageHistory.$inferSelect;
export type InsertMessageHistory = typeof messageHistory.$inferInsert;

/**
 * 파싱된 메시지 테이블 - 중복 제거 및 speaker 구분
 */
export const messages = mysqlTable("messages", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * AI 분석 결과 테이블 - 각 분석 요청에 대한 결과 저장
 */
export const analysisResults = mysqlTable("analysisResults", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  /** 입력 발췌 (최근 대화 요약) */
  inputExcerpt: text("inputExcerpt"),
  /** 전체 출력 JSON (상대심리, 답변3종, memory_summary 등) */
  outputJson: text("outputJson").notNull(),
  /** 사용된 AI 모델 */
  model: varchar("model", { length: 100 }).default("gpt-4o"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = typeof analysisResults.$inferInsert;

/**
 * 구독 테이블 - 사용자별 구독 상태 관리
 */
export const subscriptions = mysqlTable("subscriptions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * 피드백 테이블 - 사용자의 답변 피드백 저장
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  analysisResultId: int("analysisResultId").notNull().references(() => analysisResults.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 선택한 톤: soft, strong, neutral */
  tone: mysqlEnum("tone", ["soft", "strong", "neutral"]).notNull(),
  /** 만족도: 1(좋음), -1(싫음), 0(중립) */
  rating: int("rating").notNull().default(0),
  /** 피드백 코멘트 */
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

/**
 * 사용자 선호도 테이블 - 사용자별 기본 설정 저장
 */
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  /** 선호하는 톤: soft, strong, neutral */
  preferredTone: mysqlEnum("preferredTone", ["soft", "strong", "neutral"]).notNull().default("neutral"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * 에러 로그 테이블 - 프로덕션 에러 추적 및 디버깅
 */
export const errorLogs = mysqlTable("errorLogs", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

/**
 * 에러 알림 큐 - 자동 알림 시스템
 */
export const errorNotificationQueue = mysqlTable("errorNotificationQueue", {
  id: int("id").autoincrement().primaryKey(),
  errorLogId: int("errorLogId").notNull().references(() => errorLogs.id, { onDelete: "cascade" }),
  channel: mysqlEnum("channel", ["email", "slack"]).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  failureReason: text("failureReason"),
  retryCount: int("retryCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export type ErrorNotificationQueue = typeof errorNotificationQueue.$inferSelect;
export type InsertErrorNotificationQueue = typeof errorNotificationQueue.$inferInsert;

/**
 * 에러 재현 정보 - 버그 재현 시간 단축
 */
export const errorReproductionSteps = mysqlTable("errorReproductionSteps", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});



/**
 * 분석 캐시 테이블 - 동일 입력(이미지/텍스트)에 대한 분석 결과 캐싱
 * 비용 절감: 같은 스크린샷 재분석 시 LLM 호출 대신 캐시 반환
 */
export const analysisCache = mysqlTable("analysisCache", {
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
  lastHitAt: timestamp("lastHitAt"),
});

export type AnalysisCache = typeof analysisCache.$inferSelect;
export type InsertAnalysisCache = typeof analysisCache.$inferInsert;

/**
 * 베타 테스트 초대 테이블 - 베타 테스터 관리
 */

/**
 * 베타 피드백 테이블 - 베타 테스터 피드백 수집
 */
export const betaFeedback = mysqlTable("betaFeedback", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type InsertBetaFeedback = typeof betaFeedback.$inferInsert;

// 자기참조 관계 설정 (Drizzle에서 자기참조는 별도로 처리)
// duplicateOf는 다른 betaFeedback의 id를 참조할 수 있음

// 베타 피드백 테이블
export const betaFeedbacks = mysqlTable("beta_feedbacks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull(),
  feedbackType: varchar("feedback_type", { length: 20 }).notNull(), // 'feature', 'bug', 'usability'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  rating: int("rating"), // 1-5
  deviceInfo: text("device_info"),
  reproducible: boolean("reproducible").default(false),
  reproductionSteps: text("reproduction_steps"),
  screenshotUrl: varchar("screenshot_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("open"), // 'open', 'in_progress', 'resolved', 'rejected'
  priorityScore: int("priority_score").default(0),
  severity: varchar("severity", { length: 20 }), // 'low', 'medium', 'high', 'critical'
  duplicateOf: varchar("duplicate_of", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 베타 초대 테이블
export const betaInvitations = mysqlTable("beta_invitations", {

  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  tempPassword: varchar("temp_password", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at"),
});

export type BetaInvitation2 = typeof betaInvitations.$inferSelect;
export type InsertBetaInvitation2 = typeof betaInvitations.$inferInsert;
