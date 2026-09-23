import { createSupabaseServerClient } from "./supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchResult = {
  id: string;
  source: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

export type KnowledgeChunk = {
  id: string;
  source: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

type SearchOptions = {
  topK?: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
};

export async function searchKnowledgeBase(
  embedding: number[],
  options: SearchOptions = {},
  client?: SupabaseClient,
): Promise<KnowledgeChunk[]> {
  if (
    embedding.length !== 1536 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Embedding must contain 1536 finite numbers");
  }

  const topK = Math.min(Math.max(Math.floor(options.topK ?? 5), 1), 20);

  const threshold = Math.min(Math.max(options.threshold ?? 0.2, 0), 1);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
    filter_metadata: options.metadata ?? {},
  });

  if (error) {
    throw new Error(`Knowledge base search failed: ${error.message}`);
  }

  return (data ?? []) as KnowledgeChunk[];
}
