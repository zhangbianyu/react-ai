import type { SupabaseClient } from "@supabase/supabase-js";

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title?: string,
) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: title ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error("创建会话失败");
  }

  return data;
}

export async function saveMessage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  role: "user" | "assistant" | "tool",
  content: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    throw new Error("保存消息失败");
  }

  return data;
}
