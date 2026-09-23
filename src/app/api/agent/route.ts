import { NextResponse } from "next/server";
import { runStudyAgent } from "@/agents/studyAgent";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query || query.length > 500) {
      return NextResponse.json(
        {
          error: "query must be between 1 and 500 characters",
        },
        { status: 400 },
      );
    }

    const userContext = await getRequiredUser();

    const result = await runStudyAgent(query, userContext);

    return NextResponse.json({
      query,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/agent failed", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Agent execution failed",
      },
      { status: 500 },
    );
  }
}
