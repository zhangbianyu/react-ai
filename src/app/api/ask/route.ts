import { NextResponse } from "next/server";
import { openaiClient } from "@/lib/openai-client";
import { searchKnowledgeBase } from "@/lib/knowledge-base";
import { buildRetrievedContext, ragInstructions } from "@/lib/rag-prompt";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";
import { recordRequestLog } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const model = process.env.OPENAI_MODEL ?? "你的可用模型名称";

  try {
    const { supabase, userId } = await getRequiredUser();
    const startedAt = Date.now();

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
        ? Math.min(Math.max(body.topK, 1), 10)
        : 5;

    const embeddingResponse = await openaiClient.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("Query embedding was not generated");
    }

    const results = await searchKnowledgeBase(
      queryEmbedding,
      {
        topK,
        threshold: 0.2,
      },
      supabase,
    );

    if (results.length === 0) {
      return NextResponse.json({
        query,
        answer: "资料中没有找到答案。",
        sources: [],
      });
    }

    const context = buildRetrievedContext(results);

    const userInput = `
REFERENCE MATERIAL:

${context}

---

USER QUESTION:

${query}
`.trim();

    const response = await openaiClient.responses.create({
      model,
      instructions: ragInstructions,
      input: userInput,
    });

    const usage = response.usage;

    logger.info("response.completed", {
      requestId,
      userId,
      model,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      totalTokens: usage?.total_tokens,
    });

    const answer = response.output_text.trim() || "资料中没有找到答案。";

    const sources = results.map((result, index) => ({
      number: index + 1,
      source: result.source,
      title: result.title,
      similarity: result.similarity,
      chunkIndex: result.metadata?.chunkIndex ?? null,
    }));

    await recordRequestLog(supabase, {
      requestId,
      userId,
      route: "/api/ask",
      model,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      totalTokens: usage?.total_tokens,
      durationMs: Date.now() - startedAt,
      status: "success",
    });

    return NextResponse.json({
      query,
      answer,
      sources,
    });
  } catch (error) {
    console.error("POST /api/ask failed", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Ask failed",
      },
      { status: 500 },
    );
  }
}
