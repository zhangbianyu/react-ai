import { NextResponse } from "next/server";
import { openaiClient } from "@/lib/openai-client";
import { searchKnowledgeBase } from "@/lib/knowledge-base";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";
import { getRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { recordRequestLog } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const { supabase, userId } = await getRequiredUser();

  try {
    const startedAt = Date.now();

    logger.info("request.started", {
      requestId,
      route: "/api/search",
      userId,
    });

    const body = await request.json();

    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query || query.length > 500) {
      return NextResponse.json(
        {
          error: "query must be between 1 and 500 characters",
        },
        { status: 400 },
      );
    }

    const topK =
      typeof body.topK === "number" && Number.isInteger(body.topK)
        ? Math.min(Math.max(body.topK, 1), 20)
        : 5;

    const threshold =
      typeof body.threshold === "number"
        ? Math.min(Math.max(body.threshold, 0), 1)
        : 0.2;

    const embeddingResponse = await openaiClient.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: query,
    });

    // console.log('embeddingResponse111',embeddingResponse);

    const embedding = embeddingResponse.data[0].embedding;

    const usage = embeddingResponse.usage;

    logger.info("embedding.completed", {
      requestId,
      userId,
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      inputTokens: usage?.prompt_tokens,
    });

    const results = await searchKnowledgeBase(
      embedding,
      {
        topK,
        threshold,
      },
      supabase,
    );

    await recordRequestLog(supabase, {
      requestId,
      userId,
      route: "/api/search",
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      inputTokens: embeddingResponse.usage?.prompt_tokens,
      durationMs: Date.now() - startedAt,
      status: "success",
    });

    return NextResponse.json(
      {
        query,
        results,
      },
      {
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  } catch (error) {
    console.error("POST /api/search failed", error);

    logger.error("request.failed", {
      requestId,
      route: "/api/search",
      userId,
      error: "search_failed",
    });

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Search failed", requestId },
      {
        status: 500,
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  }
}
