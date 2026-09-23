import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTodayTokenUsage(
  supabase: SupabaseClient,
  userId: string,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("request_logs")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  if (error) {
    throw new Error("Failed to read token usage");
  }

  return (data ?? []).reduce(
    (total, row) => total + (row.total_tokens ?? 0),
    0,
  );
}

export async function checkDailyTokenQuota(
  supabase: SupabaseClient,
  userId: string,
  limit = 100_000,
) {
  const used = await getTodayTokenUsage(supabase, userId);

  return {
    allowed: used < limit,
    used,
    remaining: Math.max(limit - used, 0),
    limit,
  };
}
