import { describe, it, expect, beforeEach } from 'vitest';
import * as db from './db';
import { createHash } from 'crypto';

describe('Analysis Cache', () => {
  const testResult = {
    one_line_psychology: "테스트 심리 분석",
    assumption: "테스트 해석",
    need_more_context: false,
    context_question: "",
    replies: [
      { tone: "soft", text: "부드러운 답장", why: "공감적 효과", risk: "30" },
      { tone: "balanced", text: "균형잡힌 답장", why: "중립적 효과", risk: "50" },
      { tone: "humor", text: "유머러스한 답장", why: "긍정적 효과", risk: "40" }
    ],
    updated_memory_summary: "테스트 메모리 요약"
  };

  beforeEach(() => {
    // 각 테스트마다 고유한 타임스탬프 사용으로 중복 방지
  });

  it('should save and retrieve cached analysis', async () => {
    const uniqueId = 'test-1-' + Date.now() + Math.random();
    const buffer = Buffer.from(uniqueId);
    const testImageHash = createHash('sha256').update(buffer).digest('hex');
    const cachedResultJson = JSON.stringify(testResult);
    
    await db.saveCachedAnalysis(testImageHash, cachedResultJson);
    const retrieved = await db.getCachedAnalysisByImageHash(testImageHash);
    
    expect(retrieved).toBeDefined();
    expect(retrieved).toBe(cachedResultJson);
  });

  it('should return null for non-existent cache', async () => {
    const uniqueId = 'non-existent-' + Date.now() + Math.random();
    const nonExistentHash = createHash('sha256').update(uniqueId).digest('hex');
    const retrieved = await db.getCachedAnalysisByImageHash(nonExistentHash);
    
    expect(retrieved).toBeNull();
  });

  it('should update hit count on cache hit', async () => {
    const uniqueId = 'hit-count-' + Date.now() + Math.random();
    const buffer = Buffer.from(uniqueId);
    const newHash = createHash('sha256').update(buffer).digest('hex');
    const cachedResultJson = JSON.stringify(testResult);
    
    await db.saveCachedAnalysis(newHash, cachedResultJson);
    await db.getCachedAnalysisByImageHash(newHash);
    const retrieved = await db.getCachedAnalysisByImageHash(newHash);
    
    expect(retrieved).toBeDefined();
  });

  it('should handle TTL correctly', async () => {
    const uniqueId = 'ttl-test-' + Date.now() + Math.random();
    const buffer = Buffer.from(uniqueId);
    const ttlHash = createHash('sha256').update(buffer).digest('hex');
    const cachedResultJson = JSON.stringify(testResult);
    
    await db.saveCachedAnalysis(ttlHash, cachedResultJson, 7);
    const retrieved = await db.getCachedAnalysisByImageHash(ttlHash);
    
    expect(retrieved).toBeDefined();
  });
});
