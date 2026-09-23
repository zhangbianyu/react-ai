import { NextResponse } from "next/server";
import { openaiClient } from "@/lib/openai-client";
import { tools } from "@/lib/tool-definitions";
import { runTool } from "@/lib/tool-runner";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";

export const runtime = "nodejs";

const instructions = `
你是一个 AI 学习助手。

你可以使用以下工具：

- searchKnowledgeBase：搜索用户上传的知识库
- saveNote：保存学习笔记
- createTodo：创建学习待办

当用户的问题需要查询知识库、保存笔记或创建待办时，请调用对应工具。
不要假装已经执行过工具。
工具返回结果后，再根据工具结果向用户回答。
`.trim();

export async function POST(request: Request) {
  try {
    const userContext = await getRequiredUser();
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

    const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";

    /*
     * 第一次调用：
     * 让模型判断是否需要调用工具，
     * 并返回工具名称和参数。
     */
    const firstResponse = await openaiClient.responses.create({
      model,
      instructions,
      input: query,
      tools,
      tool_choice: "auto",
    });

    const toolCall = firstResponse.output.find(
      (item) => item.type === "function_call",
    );

    /*
     * 如果模型认为不需要工具，就直接返回模型回答。
     */
    if (!toolCall || toolCall.type !== "function_call") {
      return NextResponse.json({
        query,
        answer: firstResponse.output_text,
        toolCall: null,
      });
    }

    /*
     * 当前第十六天只处理一次工具调用。
     */
    if (!toolCall.name) {
      return NextResponse.json(
        {
          error: "Model did not specify a tool name",
        },
        { status: 400 },
      );
    }

    let toolArguments: unknown;

    try {
      toolArguments = JSON.parse(toolCall.arguments);
    } catch {
      return NextResponse.json(
        {
          error: "Tool arguments are not valid JSON",
        },
        { status: 400 },
      );
    }

    /*
     * 服务端真正执行工具。
     *
     * runTool 内部会：
     * 1. 检查工具名称是否在白名单中
     * 2. 使用 Zod 校验参数
     * 3. 执行 Embedding、Supabase 查询或数据库写入
     */
    const toolResult = await runTool(toolCall.name, toolArguments, userContext);

    /*
     * 第二次调用：
     * 把服务端执行结果交给模型，让模型生成最终回答。
     */
    const finalResponse = await openaiClient.responses.create({
      model,
      instructions,
      previous_response_id: firstResponse.id,
      input: [
        {
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: JSON.stringify(toolResult),
        },
      ],
    });

    return NextResponse.json({
      query,
      answer: finalResponse.output_text,
      toolCall: {
        name: toolCall.name,
        arguments: toolArguments,
      },
      toolResult,
    });
  } catch (error) {
    console.error("POST /api/tool-call failed", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Tool calling failed",
      },
      { status: 500 },
    );
  }
}
