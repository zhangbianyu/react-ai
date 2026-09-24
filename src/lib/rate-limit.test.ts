import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("第一次请求应该允许通过", () => {
    const result = checkRateLimit(`first-${Date.now()}`, 3, 60_000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("超过限制后应该拒绝请求", () => {
    const key = `limit-${Date.now()}`;

    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);

    const thirdRequest = checkRateLimit(key, 2, 60_000);

    expect(thirdRequest.allowed).toBe(false);
    expect(thirdRequest.remaining).toBe(0);
    expect(thirdRequest.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("不同 key 应该分别计数", () => {
    const keyA = `user-a-${Date.now()}`;
    const keyB = `user-b-${Date.now()}`;

    checkRateLimit(keyA, 1, 60_000);

    const secondA = checkRateLimit(keyA, 1, 60_000);
    const firstB = checkRateLimit(keyB, 1, 60_000);

    expect(secondA.allowed).toBe(false);
    expect(firstB.allowed).toBe(true);
  });

  it("时间窗口结束后应该重新计数", () => {
    const key = `reset-${Date.now()}`;

    const first = checkRateLimit(key, 1, 10);
    expect(first.allowed).toBe(true);

    const blocked = checkRateLimit(key, 1, 10);
    expect(blocked.allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterReset = checkRateLimit(key, 1, 10);

        expect(afterReset.allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});
