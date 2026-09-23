import { z } from "zod";
import type { SkillDefinition } from "./types";

export const GenerateQuizInput = z.object({
  topic: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(30000),
  questionCount: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export const GenerateQuizOutput = z.object({
  topic: z.string(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .min(1)
    .max(10),
});

export const generateQuizSkill: SkillDefinition = {
  name: "generateQuiz",
  description: "根据学习内容生成选择题测验",
  inputSchema: GenerateQuizInput,
  outputSchema: GenerateQuizOutput,
  outputName: "generate_quiz",
  allowedTools: [],
  instructions: `
你是一名学习测验设计助手。

只能根据输入的 topic 和 content 出题。
不要考查文档中没有出现的知识。
每道题必须有四个选项，并且只有一个正确答案。
answerIndex 表示正确选项的数组下标，从 0 开始。

题目数量必须遵守 questionCount。
难度必须符合 difficulty。
`.trim(),
};
