import { NextResponse } from "next/server";
import { z } from "zod";
import { runSkill } from "@/skills/run-skill";

export const runtime = "nodejs";

const SkillRequestSchema = z.object({
  skill: z.enum(["explainConcept", "summarizeDocument", "generateQuiz"]),
  input: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = SkillRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "skill 或 input 参数无效",
        },
        { status: 400 },
      );
    }

    const result = await runSkill(parsed.data.skill, parsed.data.input);

    return NextResponse.json({
      skill: parsed.data.skill,
      result,
    });
  } catch (error) {
    console.error("POST /api/skills failed", error);

    return NextResponse.json(
      {
        error: "Skill 执行失败",
      },
      { status: 500 },
    );
  }
}
