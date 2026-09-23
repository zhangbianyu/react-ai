import { embedText } from "@/lib/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type SearchResult = {
  id: string;
  source: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

type SearchOptions = {
  topK?: number;
  threshold?: number;
};

const supabaseAdmin = await createSupabaseServerClient();

export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const topK = Math.min(Math.max(options.topK ?? 5, 1), 20);
  const threshold = options.threshold ?? 0.2;

  const queryEmbedding = await embedText(normalizedQuery);

  const { data, error } = await supabaseAdmin.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    throw new Error(`知识库检索失败：${error.message}`);
  }

  return (data ?? []) as SearchResult[];
}
