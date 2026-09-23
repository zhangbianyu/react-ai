import { NextResponse } from "next/server";
import { routeSkill } from "@/skills/router";
import { runSkill } from "@/skills/run-skill";

export const runtime = "nodejs";

function removeNullValues(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userInput = typeof body.input === "string" ? body.input.trim() : "";

    if (!userInput || userInput.length > 3000) {
      return NextResponse.json(
        {
          error: "input must be between 1 and 3000 characters",
        },
        { status: 400 },
      );
    }

    const route = await routeSkill(userInput);

    if (route.skill === "none") {
      return NextResponse.json({
        skill: "none",
        reason: route.reason,
        result: null,
      });
    }

    const normalizedInput = removeNullValues(route.input);

    const result = await runSkill(route.skill, normalizedInput);

    return NextResponse.json({
      skill: route.skill,
      reason: route.reason,
      result,
    });
  } catch (error) {
    console.error("POST /api/skill-router failed", error);

    return NextResponse.json(
      {
        error: "Skill 路由执行失败",
      },
      { status: 500 },
    );
  }
}
