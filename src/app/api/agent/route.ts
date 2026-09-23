import { NextResponse } from "next/server";
import { runStudyAgent } from "@/agents/studyAgent";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";
import { getRequestId } from "@/lib/request-id";
import { recordRequestLog } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkDailyTokenQuota } from "@/lib/token-quota";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = getRequestId(request);
    const startedAt = Date.now();
    const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query || query.length > 500) {
      return NextResponse.json(
        {
          error: "query must be between 1 and 500 characters",
        },
        { status: 400 },
      );
    }

    const userContext = await getRequiredUser();

    // 限流检查
    const rateLimit = checkRateLimit(`agent:${userContext.userId}`, 10, 60_000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          requestId,
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    // 每日 Token 配额
    const quota = await checkDailyTokenQuota(
      userContext.supabase,
      userContext.userId,
      100_000,
    );

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "Daily token quota exceeded",
          quota,
          requestId,
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
          },
        },
      );
    }

    const result = await runStudyAgent(query, userContext, {
      requestId,
      model,
    });

    await recordRequestLog(userContext.supabase, {
      requestId,
      userId: userContext.userId,
      route: "/api/agent",
      model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      durationMs: Date.now() - startedAt,
      status: "success",
    });

    return NextResponse.json({
      query,
      ...result,
      requestId,
    });
  } catch (error) {
    console.error("POST /api/agent failed", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Agent execution failed",
      },
      { status: 500 },
    );
  }
}
