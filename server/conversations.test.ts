import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("conversations", () => {
  it("should create a new conversation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.conversations.create({
      partnerName: "테스트 상대",
      relationshipType: "썸",
      goals: ["약속 잡기", "분위기 유지"],
      restrictions: ["장문"],
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list user conversations", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a conversation first
    await caller.conversations.create({
      partnerName: "테스트 상대",
      relationshipType: "연애",
      goals: ["감정 확인"],
    });

    const conversations = await caller.conversations.list();

    expect(Array.isArray(conversations)).toBe(true);
    expect(conversations.length).toBeGreaterThan(0);
  });

  it("should get a specific conversation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.conversations.create({
      partnerName: "특정 상대",
      relationshipType: "직장",
      goals: ["선 긋기"],
    });

    const conversation = await caller.conversations.get({ id: created.id });

    expect(conversation).toBeDefined();
    expect(conversation?.partnerName).toBe("특정 상대");
    expect(conversation?.relationshipType).toBe("직장");
  });

  it("should update conversation profile", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.conversations.create({
      partnerName: "업데이트 테스트",
      relationshipType: "썸",
      goals: ["약속 잡기"],
    });

    const updateResult = await caller.conversations.update({
      id: created.id,
      partnerName: "업데이트된 이름",
      goals: ["분위기 유지", "감정 확인"],
    });

    expect(updateResult.success).toBe(true);

    const updated = await caller.conversations.get({ id: created.id });
    expect(updated?.partnerName).toBe("업데이트된 이름");
  });

  it("should delete a conversation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.conversations.create({
      partnerName: "삭제 테스트",
      relationshipType: "기타",
      goals: ["사과"],
    });

    const deleteResult = await caller.conversations.delete({ id: created.id });
    expect(deleteResult.success).toBe(true);

    const deleted = await caller.conversations.get({ id: created.id });
    expect(deleted).toBeUndefined();
  });
});

describe("subscription", () => {
  it("should get user subscription", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const subscription = await caller.subscription.get();
    
    // 초기에는 구독이 없을 수 있음
    expect(subscription === undefined || subscription === null || typeof subscription === "object").toBe(true);
  });

  it("should create or update subscription", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.update({
      plan: "basic",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
    });

    expect(result.success).toBe(true);

    const subscription = await caller.subscription.get();
    expect(subscription).toBeDefined();
    expect(subscription?.plan).toBe("basic");
    expect(subscription?.status).toBe("active");
  });
});
