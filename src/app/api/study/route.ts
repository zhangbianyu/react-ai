import { NextResponse } from "next/server";
import { runStudyWorkflow } from "@/skills/run-study-workflow";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userContext = await getRequiredUser();
    const body = await request.json();

    const input = typeof body.input === "string" ? body.input.trim() : "";

    if (!input || input.length > 3000) {
      return NextResponse.json(
        {
          error: "input must be between 1 and 3000 characters",
        },
        { status: 400 },
      );
    }

    const result = await runStudyWorkflow(input, userContext);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/study failed", error);

    return NextResponse.json(
      {
        error: "Study workflow failed",
      },
      { status: 500 },
    );
  }
}
