import type { SupabaseClient } from "@supabase/supabase-js";

type RequestLog = {
  requestId: string;
  userId: string;
  route: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs: number;
  status: "success" | "error";
  errorCode?: string;
};

export type ToolExecutionMeta = {
  requestId: string;
  model?: string;
};

function sanitizeToolArguments(toolName: string, value: unknown) {
  if (toolName === "saveNote" && value && typeof value === "object") {
    const input = value as Record<string, unknown>;

    return {
      title: input.title,
      contentLength:
        typeof input.content === "string" ? input.content.length : 0,
    };
  }

  return value;
}

export async function recordRequestLog(
  supabase: SupabaseClient,
  log: RequestLog,
) {
  const { error } = await supabase.from("request_logs").insert({
    request_id: log.requestId,
    user_id: log.userId,
    route: log.route,
    model: log.model ?? null,
    input_tokens: log.inputTokens ?? null,
    output_tokens: log.outputTokens ?? null,
    total_tokens: log.totalTokens ?? null,
    duration_ms: log.durationMs,
    status: log.status,
    error_code: log.errorCode ?? null,
  });

  if (error) {
    console.error("recordRequestLog failed", error.code);
  }
}

export async function recordToolLog(
  supabase: SupabaseClient,
  data: {
    requestId: string;
    userId: string;
    toolName: string;
    arguments: unknown;
    result?: unknown;
    status: "success" | "failed" | "timeout";
    errorCode?: string;
    durationMs: number;
    model?: string;
  },
) {
  const { error } = await supabase.from("tool_logs").insert({
    request_id: data.requestId,
    user_id: data.userId,
    tool_name: data.toolName,
    arguments: sanitizeToolArguments(data.toolName, data.arguments),
    result: data.result ?? null,
    status: data.status,
    error_code: data.errorCode ?? null,
    duration_ms: data.durationMs,
    model: data.model ?? null,
  });

  if (error) {
    console.error("recordToolLog failed", error.code);
  }
}
