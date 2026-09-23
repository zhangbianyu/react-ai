import { NextResponse } from "next/server";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;

    const { supabase, userId } = await getRequiredUser();

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const { data: messages, error: messageError } = await supabase
      .from("messages")
      .select("id, role, content, metadata, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", {
        ascending: true,
      });

    if (messageError) {
      throw messageError;
    }

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("GET conversation failed", error);

    return NextResponse.json({ error: "读取会话失败" }, { status: 500 });
  }
}
