// import OpenAI from "openai";

// type UserLevel = "beginner" | "advanced";

// type RequestBody = {
//   concept?: unknown;
//   level?: unknown;
// };

// function json(data: unknown, status = 200) {
//   return new Response(JSON.stringify(data), {
//     status,
//     headers: {
//       "Content-Type": "application/json; charset=utf-8"
//     }
//   });
// }

// export async function POST(request: Request) {
//   try {
//     const body = (await request.json()) as RequestBody;

//     const concept =
//       typeof body.concept === "string"
//         ? body.concept.trim()
//         : "";

//     const level: UserLevel =
//       body.level === "advanced"
//         ? "advanced"
//         : "beginner";

//     if (!concept) {
//       return json(
//         {
//           error: "concept 必须是非空字符串"
//         },
//         400
//       );
//     }

//     if (concept.length > 100) {
//       return json(
//         {
//           error: "concept 长度不能超过 100 个字符"
//         },
//         400
//       );
//     }

//     const apiKey = process.env.OPENAI_API_KEY;
//     const model = process.env.OPENAI_MODEL;

//     if (!apiKey) {
//       return json(
//         {
//           error: "服务端缺少 OPENAI_API_KEY"
//         },
//         500
//       );
//     }

//     if (!model) {
//       return json(
//         {
//           error: "服务端缺少 OPENAI_MODEL"
//         },
//         500
//       );
//     }

//     const client = new OpenAI({
//       apiKey
//     });

//     const learnerDescription =
//       level === "beginner"
//         ? "用户是 JavaScript 和 AI 初学者，请使用通俗语言解释。"
//         : "用户有一定开发经验，可以使用专业术语，并说明工程实践。";

//     const response = await client.responses.create({
//       model,

//       instructions: `
// 你是一名中文 AI 技术老师。

// ${learnerDescription}

// 请解释用户提供的技术概念，并严格使用以下结构：

// ## 一句话定义

// ## 生活类比

// ## JavaScript 示例

// ## 代码解释

// ## 适用场景

// ## 常见误区

// 要求：

// 1. 内容准确
// 2. 示例代码可以运行
// 3. 不要编造不存在的 API
// 4. 如果信息不确定，请明确说明
// 5. 不要输出与主题无关的内容
//       `.trim(),

//       input: `请解释这个技术概念：${concept}`
//     });

//     const answer = response.output_text.trim();

//     if (!answer) {
//       return json(
//         {
//           error: "模型没有返回有效回答"
//         },
//         502
//       );
//     }

//     return json({
//       concept,
//       level,
//       answer
//     });
//   } catch (error) {
//     console.error("Explain API error:", error);

//     return json(
//       {
//         error: "服务器处理请求失败"
//       },
//       500
//     );
//   }
// }

// day 6  启流式输出
import OpenAI from "openai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages?: unknown;
  level?: unknown;
};

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isChatMessage)
      : [];
    const level = body.level === "advanced" ? "advanced" : "beginner";

    if (messages.length === 0) {
      return json({ error: "messages 不能为空" }, 400);
    }

    if (messages.length > 20) {
      return json({ error: "对话历史不能超过 20 条消息" }, 400);
    }

    if (messages.some((message) => message.content.length > 8000)) {
      return json({ error: "单条消息不能超过 8000 个字符" }, 400);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      return json({ error: "服务端缺少 OPENAI_API_KEY 或 OPENAI_MODEL" }, 500);
    }

    const client = new OpenAI({ apiKey });
    const learnerDescription =
      level === "advanced"
        ? "用户有开发经验，可以使用专业术语，并说明工程实践。"
        : "用户是初学者，请使用简单语言、类比和短代码示例。";

    const stream = await client.responses.create({
      model,
      instructions: `
你是一名中文 AI 技术老师。

${learnerDescription}

请准确回答用户问题。涉及代码时，使用 Markdown 代码块。
如果不知道答案，不要编造；请明确说明不确定的部分。
      `.trim(),
      input: messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(
                encoder.encode(sse({ type: "delta", text: event.delta })),
              );
            }

            if (event.type === "error") {
              controller.enqueue(
                encoder.encode(sse({ type: "error", message: event.message })),
              );
            }
          }

          controller.enqueue(encoder.encode(sse({ type: "done" })));
          controller.close();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "模型请求失败";

          controller.enqueue(encoder.encode(sse({ type: "error", message })));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return json({ error: "服务器处理请求失败" }, 500);
  }
}
