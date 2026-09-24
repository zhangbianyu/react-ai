import { describe, expect, it, vi } from "vitest";
import { checkDailyTokenQuota, getTodayTokenUsage } from "@/lib/token-quota";

function createSupabaseMock(
  rows: Array<{ total_tokens: number | null }>,
  error: unknown = null,
) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockResolvedValue({
    data: rows,
    error,
  });

  return {
    from: vi.fn(() => query),
  } as never;
}

describe("token-quota", () => {
  it("应该累计当天的 Token", async () => {
    const supabase = createSupabaseMock([
      { total_tokens: 100 },
      { total_tokens: 250 },
      { total_tokens: null },
    ]);

    const result = await getTodayTokenUsage(supabase, "user-1");

    expect(result).toBe(350);
  });

  it("低于配额时应该允许请求", async () => {
    const supabase = createSupabaseMock([
      { total_tokens: 100 },
      { total_tokens: 200 },
    ]);

    const result = await checkDailyTokenQuota(supabase, "user-1", 1000);

    expect(result).toEqual({
      allowed: true,
      used: 300,
      remaining: 700,
      limit: 1000,
    });
  });

  it("达到配额时应该拒绝请求", async () => {
    const supabase = createSupabaseMock([
      { total_tokens: 800 },
      { total_tokens: 200 },
    ]);

    const result = await checkDailyTokenQuota(supabase, "user-1", 1000);

    expect(result).toEqual({
      allowed: false,
      used: 1000,
      remaining: 0,
      limit: 1000,
    });
  });

  it("Supabase 查询失败时应该抛出安全错误", async () => {
    const supabase = createSupabaseMock([], { message: "database details" });

    await expect(getTodayTokenUsage(supabase, "user-1")).rejects.toThrow(
      "Failed to read token usage",
    );

    await expect(getTodayTokenUsage(supabase, "user-1")).rejects.not.toThrow(
      "database details",
    );
  });
});
