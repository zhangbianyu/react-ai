import { z } from "zod";
import { openaiClient } from "@/lib/openai-client";
import { searchKnowledgeBase } from "@/lib/knowledge-base";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserContext } from "@/lib/auth-user";

type ToolSuccess = {
  success: true;
  result: unknown;
};

type ToolFailure = {
  success: false;
  code: string;
  error: string;
};

export type ToolContext = {
  supabase: SupabaseClient;
  userId: string;
  requestId: string;
  model: string;
};

export type ToolResult = ToolSuccess | ToolFailure;

const SearchArgsSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
  })
  .strict();

const SaveNoteArgsSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    content: z.string().trim().min(1).max(10000),
  })
  .strict();

const CreateTodoArgsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    dueDate: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dueDate === "") {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.dueDate)) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "dueDate 必须是 YYYY-MM-DD 格式",
      });
    }
  });

export async function runTool(
  name: string,
  rawArguments: unknown,
  context: UserContext,
) {
  switch (name) {
    case "searchKnowledgeBase":
      return runSearchKnowledgeBase(rawArguments);

    case "saveNote":
      return runSaveNote(rawArguments, context);

    case "createTodo":
      return runCreateTodo(rawArguments, context);

    default:
      throw new Error(`不允许调用工具：${name}`);
  }
}

export async function runSearchKnowledgeBase(
  rawArguments: unknown,
  // context: UserContext,
) {
  const parsed = SearchArgsSchema.safeParse(rawArguments);

  if (!parsed.success) {
    throw new Error("searchKnowledgeBase 参数无效");
  }

  const embeddingResponse = await openaiClient.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: parsed.data.query,
  });

  const embedding = embeddingResponse.data[0]?.embedding;

  if (!embedding) {
    throw new Error("问题 Embedding 生成失败");
  }

  const results = await searchKnowledgeBase(embedding, {
    topK: 5,
    threshold: 0.2,
  });

  return {
    query: parsed.data.query,
    results,
  };
}

async function runSaveNote(rawArguments: unknown, context: UserContext) {
  const parsed = SaveNoteArgsSchema.safeParse(rawArguments);

  if (!parsed.success) {
    throw new Error("saveNote 参数无效");
  }

  const { data, error } = await context.supabase
    .from("notes")
    .insert({
      user_id: context.userId,
      title: parsed.data.title,
      content: parsed.data.content,
    })
    .select("id, title, content, created_at")
    .single();

  if (error) {
    throw new Error(`保存笔记失败：${error.message}`);
  }

  return {
    success: true,
    note: data,
  };
}

async function runCreateTodo(rawArguments: unknown, context: UserContext) {
  const parsed = CreateTodoArgsSchema.safeParse(rawArguments);

  if (!parsed.success) {
    throw new Error("createTodo 参数无效");
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .insert({
      user_id: context.userId,
      title: parsed.data.title,
      due_date: parsed.data.dueDate || null,
      status: "pending",
    })
    .select("id, title, due_date, status, created_at")
    .single();

  if (error) {
    throw new Error(`创建待办失败：${error.message}`);
  }

  return {
    success: true,
    task: data,
  };
}
