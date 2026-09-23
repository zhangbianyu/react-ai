import dotenv from "dotenv";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

dotenv.config({
  path: ".env.local"
});

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;

if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY");
}

if (!model) {
  throw new Error("缺少 OPENAI_MODEL");
}

const client = new OpenAI({
  apiKey
});

// 定义模型必须返回的数据结构
const LearningPlan = z.object({
  goal: z.string(),
  summary: z.string(),
  days: z.array(
    z.object({
      day: z.number(),
      title: z.string(),
      objectives: z.array(z.string()),
      tasks: z.array(z.string()),
      deliverable: z.string()
    })
  )
});

const userInput = `
我想学习如何使用 React、Next.js 和 OpenAI API
开发一个 AI 工具。

请给我制定一个 3 天的学习计划。
我的水平是 JavaScript 初学者。
`.trim();

try {
  const response = await client.responses.parse({
    model,

    instructions: `
你是一名专业的 AI 编程老师。

请根据用户需求生成学习计划。

要求：
1. 使用中文
2. 计划必须具体可执行
3. 每天包含学习目标、实践任务和当天产物
4. 不要返回 Markdown
5. 必须严格遵守指定的数据结构
    `.trim(),

    input: userInput,

    text: {
      format: zodTextFormat(LearningPlan, "learning_plan")
    }
  });

  const plan = response.output_parsed;

  if (!plan) {
    console.error("模型没有返回符合结构的数据：");
    console.error(response.output_text);
    process.exit(1);
  }

  console.log("结构化结果：");
  console.log(JSON.stringify(plan, null, 2));

  console.log("\n学习目标：");
  console.log(plan.goal);

  console.log("\n每天的计划：");

  for (const item of plan.days) {
    console.log(`\n第 ${item.day} 天：${item.title}`);
    console.log("学习目标：");

    for (const objective of item.objectives) {
      console.log(`- ${objective}`);
    }

    console.log("实践任务：");

    for (const task of item.tasks) {
      console.log(`- ${task}`);
    }

    console.log(`当天产物：${item.deliverable}`);
  }
} catch (error) {
  console.error("请求失败：", error.message);
}