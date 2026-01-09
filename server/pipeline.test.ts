import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

/**
 * 파이프라인 API 테스트
 * - uploads 테이블 CRUD
 * - 파이프라인 단계별 상태 관리
 */
describe("Pipeline API", () => {
  let testConversationId: number;
  let testUploadId: number;

  beforeAll(async () => {
    // 테스트용 대화방 생성
    testConversationId = await db.createConversation({
      userId: 1,
      partnerName: "테스트 상대",
      relationshipType: "썸",
      goals: JSON.stringify(["관계 유지"]),
      restrictions: JSON.stringify([]),
    });
  });

  it("should create upload with pending status", async () => {
    testUploadId = await db.createUpload({
      conversationId: testConversationId,
      status: "pending",
    });

    expect(testUploadId).toBeGreaterThan(0);

    const upload = await db.getUploadById(testUploadId);
    expect(upload).toBeDefined();
    expect(upload?.status).toBe("pending");
    expect(upload?.conversationId).toBe(testConversationId);
  });

  it("should update upload status to ocr_done", async () => {
    await db.updateUpload(testUploadId, {
      status: "ocr_done",
      screenshotUrl: "https://example.com/screenshot.png",
      ocrTextRaw: "나: 안녕\n상대: 반가워",
    });

    const upload = await db.getUploadById(testUploadId);
    expect(upload?.status).toBe("ocr_done");
    expect(upload?.screenshotUrl).toBe("https://example.com/screenshot.png");
    expect(upload?.ocrTextRaw).toContain("안녕");
  });

  it("should update upload status to ingested", async () => {
    await db.updateUpload(testUploadId, {
      status: "ingested",
      ocrParsedJson: JSON.stringify([
        { speaker: "me", content: "안녕", hash: "hash1" },
        { speaker: "other", content: "반가워", hash: "hash2" },
      ]),
    });

    const upload = await db.getUploadById(testUploadId);
    expect(upload?.status).toBe("ingested");
    expect(upload?.ocrParsedJson).toBeDefined();
  });

  it("should update upload status to analyzed", async () => {
    await db.updateUpload(testUploadId, {
      status: "analyzed",
    });

    const upload = await db.getUploadById(testUploadId);
    expect(upload?.status).toBe("analyzed");
  });

  it("should get uploads by conversation id", async () => {
    const uploads = await db.getUploadsByConversationId(testConversationId);
    expect(uploads.length).toBeGreaterThan(0);
    expect(uploads[0].conversationId).toBe(testConversationId);
  });

  it("should handle upload error state", async () => {
    const errorUploadId = await db.createUpload({
      conversationId: testConversationId,
      status: "pending",
    });

    await db.updateUpload(errorUploadId, {
      status: "pending",
      errorMessage: "OCR 실패: 이미지를 읽을 수 없습니다",
    });

    const upload = await db.getUploadById(errorUploadId);
    expect(upload?.errorMessage).toContain("OCR 실패");
  });
});
