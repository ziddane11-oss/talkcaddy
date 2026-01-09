import { eq, lt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  conversations,
  InsertConversation,
  uploads,
  InsertUpload,
  messageHistory,
  InsertMessageHistory,
  analysisResults,
  InsertAnalysisResult,
  subscriptions,
  InsertSubscription,
  feedback,
  InsertFeedback,
  analysisCache,
  InsertAnalysisCache
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Messages (파싱된 메시지) ==========
import { messages, InsertMessage } from "../drizzle/schema";

export async function addMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(message);
  return result;
}

export async function getMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function getExistingMessageHashes(conversationId: number): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();

  const result = await db.select({ hash: messages.hash }).from(messages).where(eq(messages.conversationId, conversationId));
  return new Set(result.map(r => r.hash));
}

export async function getRecentMessagesByConversationId(conversationId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(limit);
}

// TODO: add feature queries here as your schema grows.

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}

export async function getConversationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.userId, userId));
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateConversation(id: number, data: Partial<InsertConversation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conversations).set(data).where(eq(conversations.id, id));
}

export async function deleteConversation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(conversations).where(eq(conversations.id, id));
}

// Message History helpers
export async function addMessageHistory(data: InsertMessageHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messageHistory).values(data);
  return result[0].insertId;
}

export async function getMessageHistoryByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messageHistory).where(eq(messageHistory.conversationId, conversationId));
}

// Analysis Result helpers
export async function saveAnalysisResult(data: InsertAnalysisResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(analysisResults).values(data);
  return result[0].insertId;
}

export async function getLatestAnalysisResult(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(analysisResults)
    .where(eq(analysisResults.conversationId, conversationId))
    .orderBy(analysisResults.createdAt)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Subscription helpers
export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSubscriptionByUserId(data.userId!);
  if (existing) {
    await db.update(subscriptions).set(data).where(eq(subscriptions.userId, data.userId!));
  } else {
    await db.insert(subscriptions).values(data);
  }
}

// Upload helpers (파이프라인 단계화)
export async function createUpload(data: InsertUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uploads).values(data);
  return result[0].insertId;
}

export async function getUploadById(uploadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUpload(uploadId: number, data: Partial<InsertUpload>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(uploads).set(data).where(eq(uploads.id, uploadId));
}

export async function getUploadsByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uploads)
    .where(eq(uploads.conversationId, conversationId))
    .orderBy(uploads.createdAt);
}

// Feedback helpers
export async function saveFeedback(data: InsertFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(feedback).values(data);
  return result[0].insertId;
}

export async function getFeedbackByAnalysisId(analysisResultId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(feedback)
    .where(eq(feedback.analysisResultId, analysisResultId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Analysis Cache helpers
/**
 * 캐시에서 분석 결과 조회 (imageHash 기반)
 * @param imageHash 이미지 바이너리의 SHA-256 해시
 * @returns 캐시된 분석 결과 또는 null
 */
export async function getCachedAnalysisByImageHash(imageHash: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(analysisCache)
    .where(eq(analysisCache.imageHash, imageHash))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const cache = result[0];
  
  // TTL 확인: 만료되었으면 null 반환
  if (new Date() > new Date(cache.expiresAt)) {
    // 만료된 캐시 삭제 (백그라운드)
    db.delete(analysisCache).where(eq(analysisCache.id, cache.id)).catch(err => 
      console.warn("[Cache] Failed to delete expired cache:", err)
    );
    return null;
  }
  
  // 적중 횟수 및 마지막 적중 시간 업데이트 (백그라운드)
  db.update(analysisCache)
    .set({
      hitCount: cache.hitCount + 1,
      lastHitAt: new Date(),
    })
    .where(eq(analysisCache.id, cache.id))
    .catch(err => console.warn("[Cache] Failed to update hit count:", err));
  
  return cache.cachedResult;
}

/**
 * 분석 결과를 캐시에 저장
 * @param imageHash 이미지 바이너리의 SHA-256 해시
 * @param cachedResult 분석 결과 JSON 문자열
 * @param ttlDays TTL (기본값: 7일)
 */
export async function saveCachedAnalysis(
  imageHash: string,
  cachedResult: string,
  ttlDays: number = 7
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  
  try {
    await db.insert(analysisCache).values({
      imageHash,
      cachedResult,
      expiresAt,
    });
  } catch (error: any) {
    // 중복 키 에러는 무시 (동시 요청 시 발생 가능)
    if (error.code !== 'ER_DUP_ENTRY') {
      throw error;
    }
  }
}

/**
 * 만료된 캐시 정리 (수동 호출용)
 */
export async function cleanupExpiredCache() {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    await db.delete(analysisCache)
      .where(lt(analysisCache.expiresAt, new Date()));
    return 1; // 성공
  } catch (error) {
    console.warn("[Cache] Failed to cleanup expired cache:", error);
    return 0;
  }
}
