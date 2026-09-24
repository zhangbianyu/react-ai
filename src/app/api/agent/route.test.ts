import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequiredUser: vi.fn(),
  runStudyAgent: vi.fn(),
  recordRequestLog: vi.fn(),
  checkRateLimit: vi.fn(),
  checkDailyTokenQuota: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({
  getRequiredUser: mocks.getRequiredUser,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock("@/agents/studyAgent", () => ({
  runStudyAgent: mocks.runStudyAgent,
}));

vi.mock("@/lib/observability", () => ({
  recordRequestLog: mocks.recordRequestLog,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/lib/token-quota", () => ({
  checkDailyTokenQuota: mocks.checkDailyTokenQuota,
}));

import { POST } from "@/app/api/agent/route";

describe("POST /api/agent", () => {
  it("query 合法时应该返回 Agent 结果", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      user: { id: "user-1" },
      userId: "user-1",
      supabase: {},
    });

    mocks.checkRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 0,
    });

    mocks.checkDailyTokenQuota.mockResolvedValue({
      allowed: true,
      used: 100,
      remaining: 99900,
      limit: 100000,
    });

    mocks.runStudyAgent.mockResolvedValue({
      answer: "RAG 是检索增强生成。",
      steps: 1,
      toolCalls: 0,
      usage: {
        inputTokens: 10,
        outputTokens: 8,
        totalTokens: 18,
      },
    });

    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "api-test-001",
      },
      body: JSON.stringify({
        query: "什么是 RAG？",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toBe("RAG 是检索增强生成。");
    expect(body.requestId).toBe("api-test-001");
  });

  it("query 为空时应该返回 400", async () => {
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      body: JSON.stringify({
        query: "",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.runStudyAgent).not.toHaveBeenCalled();
  });

  it("超过限流时应该返回 429", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      user: { id: "user-1" },
      userId: "user-1",
      supabase: {},
    });

    mocks.checkRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
    });

    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      body: JSON.stringify({
        query: "请搜索 RAG",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests");
    expect(mocks.runStudyAgent).not.toHaveBeenCalled();
  });
});
