// src/skills/router.ts

import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openaiClient } from "@/lib/openai-client";

export const SkillRouteSchema = z.object({
  skill: z.enum([
    "explainConcept",
    "summarizeDocument",
    "generateQuiz",
    "none",
  ]),
  reason: z.string(),
  searchQuery: z.string().nullable(),
  needsKnowledgeBase: z.boolean(),
  input: z.object({
    concept: z.string().nullable(),
    level: z.enum(["beginner", "intermediate", "advanced"]).nullable(),

    title: z.string().nullable(),
    content: z.string().nullable(),
    maxPoints: z.number().int().min(3).max(10).nullable(),

    topic: z.string().nullable(),
    questionCount: z.number().int().min(1).max(10).nullable(),
    difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  }),
});

export type SkillRoute = z.infer<typeof SkillRouteSchema>;

export async function routeSkill(userInput: string): Promise<SkillRoute> {
  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL 未配置");
  }

  const response = await openaiClient.responses.parse({
    model,
    instructions: `
你是一个 Skill 路由器。

根据用户输入选择 Skill：

- explainConcept：解释 AI 或编程概念
- summarizeDocument：总结文档
- generateQuiz：根据学习内容出题
- none：以上 Skill 都不适合

如果需要查询知识库，请生成一个简洁、适合语义检索的 searchQuery。
searchQuery 只包含需要查找的知识主题，不要包含“请解释”“请保存”等操作指令。
如果不需要知识库，searchQuery 必须为 null。

如果用户明确要求根据个人知识库、上传文档或资料回答，
needsKnowledgeBase 必须为 true。

缺失字段必须返回 null。
不要编造用户没有提供的信息。
      `.trim(),
    input: userInput,
    text: {
      format: zodTextFormat(SkillRouteSchema, "skill_route"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Skill 路由没有返回结果");
  }

  return SkillRouteSchema.parse(response.output_parsed);
}
