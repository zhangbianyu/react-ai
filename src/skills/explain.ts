import { z } from "zod";
import type { SkillDefinition } from "./types";

export const ExplainConceptInput = z.object({
  concept: z.string().trim().min(1).max(200),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
});

export const ExplainConceptOutput = z.object({
  concept: z.string(),
  definition: z.string(),
  analogy: z.string(),
  example: z.string(),
  useCases: z.array(z.string()),
  commonMistakes: z.array(z.string()),
});

export const explainConceptSkill: SkillDefinition = {
  name: "explainConcept",
  description: "面向指定水平解释 AI 或编程概念",
  inputSchema: ExplainConceptInput,
  outputSchema: ExplainConceptOutput,
  outputName: "explain_concept",
  allowedTools: [],
  instructions: `
你是一名面向学习者的 AI 和编程老师。

请根据输入的学习水平解释指定概念，并输出：
1. 简明定义
2. 生活化类比
3. 简单示例
4. 使用场景
5. 常见错误

回答必须准确、清晰，不要编造 API 参数或不存在的事实。
输出内容必须符合指定的结构。
`.trim(),
};
