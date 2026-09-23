import { z } from "zod";
import type { SkillDefinition } from "./types";

export const SummarizeDocumentInput = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(30000),
  maxPoints: z.number().int().min(3).max(10).default(5),
});

export const SummarizeDocumentOutput = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  keywords: z.array(z.string()),
});

export const summarizeDocumentSkill: SkillDefinition = {
  name: "summarizeDocument",
  description: "总结用户提供的文档内容",
  inputSchema: SummarizeDocumentInput,
  outputSchema: SummarizeDocumentOutput,
  outputName: "summarize_document",
  allowedTools: [],
  instructions: `
你是一名文档总结助手。

只能根据用户提供的文档内容进行总结。
不要使用文档之外的知识补充事实。
如果文档内容不足以支持某个结论，不要自行猜测。

请输出：
1. 文档标题
2. 简明总结
3. 关键要点
4. 关键词

关键要点数量必须遵守 maxPoints。
`.trim(),
};
