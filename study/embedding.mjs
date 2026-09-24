import dotenv from "dotenv";
import { chunks } from "./chunk.mjs";
import { writeFile } from "node:fs/promises";
import { openaiClient } from "@/lib/openai-client";

dotenv.config({
  path: ".env.local",
});

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY");
}

// const embeddingModel = "text-embedding-3-small";

// const documents = [
//   {
//     id: 1,
//     title: "什么是 RAG",
//     content:
//       "RAG 是检索增强生成。它会先从知识库中检索相关内容，再把内容交给大语言模型生成回答。",
//   },
//   {
//     id: 2,
//     title: "什么是 Embedding",
//     content:
//       "Embedding 会把文本转换为向量，语义相近的文本通常具有更相近的向量。",
//   },
//   {
//     id: 3,
//     title: "什么是 React",
//     content:
//       "React 是一个用于构建用户界面的 JavaScript 库，核心思想是组件化开发。",
//   },
//   {
//     id: 4,
//     title: "什么是 Agent",
//     content: "Agent 可以根据目标进行规划，并调用工具完成任务。",
//   },
// ];

// const query =
//   process.argv.slice(2).join(" ") || "如何让 AI 根据自己的知识库回答问题？";

// async function createEmbeddings(texts) {
//   const response = await client.embeddings.create({
//     model: embeddingModel,
//     input: texts,
//     encoding_format: "float",
//   });

//   console.log("Embedding usage:", response.usage);
//   return response.data
//     .sort((a, b) => a.index - b.index)
//     .map((item) => item.embedding);
// }

// function cosineSimilarity(vectorA, vectorB) {
//   let dotProduct = 0;
//   let magnitudeA = 0;
//   let magnitudeB = 0;

//   for (let i = 0; i < vectorA.length; i++) {
//     dotProduct += vectorA[i] * vectorB[i];
//     magnitudeA += vectorA[i] ** 2;
//     magnitudeB += vectorB[i] ** 2;
//   }

//   const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

//   if (denominator === 0) {
//     return 0;
//   }

//   return dotProduct / denominator;
// }

// const allTexts = [query, ...documents.map((document) => document.content)];

// const vectors = await createEmbeddings(allTexts);

// const queryVector = vectors[0];

// const results = documents
//   .map((document, index) => {
//     const documentVector = vectors[index + 1];

//     return {
//       ...document,
//       score: cosineSimilarity(queryVector, documentVector),
//     };
//   })
//   .sort((a, b) => b.score - a.score);

// console.log(`\n问题：${query}`);
// console.log("\n最相关的文档：");

// for (const result of results) {
//   console.log("\n--------------------");
//   console.log(`标题：${result.title}`);
//   console.log(`相似度：${result.score.toFixed(4)}`);
//   console.log(`内容：${result.content}`);
// }

/**
 * chunk
 */
async function embedChunks(chunks) {
  const texts = chunks.map((chunk) => chunk.text);

  const response = await openaiClient.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  });

  return response.data.map((item, index) => ({
    ...chunks[index],
    embedding: item.embedding,
  }));
}

const chunksWithEmbeddings = await embedChunks(chunks);

console.log({
  id: chunksWithEmbeddings[0].id,
  title: chunksWithEmbeddings[0].title,
  vectorLength: chunksWithEmbeddings[0].embedding.length,
});

await writeFile("chunks.json", JSON.stringify(chunks, null, 2), "utf8");
