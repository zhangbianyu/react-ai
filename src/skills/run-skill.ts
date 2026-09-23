import { zodTextFormat } from "openai/helpers/zod";
import { openaiClient } from "@/lib/openai-client";
import { skillRegistry } from "./registry";
import type { SkillName } from "./types";

export async function runSkill(name: SkillName, rawInput: unknown) {
  const skill = skillRegistry[name];

  if (!skill) {
    throw new Error(`未知 Skill：${name}`);
  }

  const parsedInput = skill.inputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    throw new Error(`${name} 输入参数无效`);
  }

  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL 未配置");
  }

  const response = await openaiClient.responses.parse({
    model,
    instructions: skill.instructions,
    input: JSON.stringify(parsedInput.data),
    text: {
      format: zodTextFormat(skill.outputSchema, skill.outputName),
    },
  });

  if (!response.output_parsed) {
    throw new Error(`${name} 没有返回结构化结果`);
  }

  return skill.outputSchema.parse(response.output_parsed);
}
