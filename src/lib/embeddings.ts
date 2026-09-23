import { openaiClient } from "./openai-client";

export async function embedTexts(
  texts: string[],
  batchSize = 100,
): Promise<number[][]> {
  const result: number[][] = [];

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize);

    const response = await openaiClient.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: batch,
    });

    const embeddings = [...response.data]
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    result.push(...embeddings);
  }

  return result;
}

export async function embedText(text: string): Promise<number[]> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("文本不能为空");
  }

  const embeddings = await embedTexts([normalizedText]);

  if (!embeddings[0]) {
    throw new Error("Embedding 生成失败");
  }

  return embeddings[0];
}
