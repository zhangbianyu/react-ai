import { NextResponse } from "next/server";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";
import { createConversation, saveMessage } from "@/lib/conversation-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getRequiredUser();

    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "新对话";

    const content = typeof body.content === "string" ? body.content.trim() : "";

    const conversation = await createConversation(supabase, userId, title);

    let message = null;

    if (content) {
      message = await saveMessage(
        supabase,
        userId,
        conversation.id,
        "user",
        content,
      );
    }

    return NextResponse.json({
      conversation,
      message,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("POST /api/conversations failed", error);

    return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
  }
}
