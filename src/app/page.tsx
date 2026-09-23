// "use client";

// import { FormEvent, useState } from "react";

// type UserLevel = "beginner" | "advanced";

// type ExplainResponse = {
//   concept?: string;
//   answer?: string;
//   error?: string;
// };

// export default function HomePage() {
//   const [concept, setConcept] = useState("");
//   const [level, setLevel] = useState<UserLevel>("beginner");
//   const [answer, setAnswer] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault();

//     const trimmedConcept = concept.trim();

//     if (!trimmedConcept) {
//       setError("请输入一个技术概念");
//       setAnswer("");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     setAnswer("");

//     try {
//       const response = await fetch("/api/explain", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           concept: trimmedConcept,
//           level
//         })
//       });

//       const data: ExplainResponse = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "请求失败");
//       }

//       if (!data.answer) {
//         throw new Error("接口没有返回回答");
//       }

//       setAnswer(data.answer);
//     } catch (error) {
//       const message =
//         error instanceof Error
//           ? error.message
//           : "发生未知错误";

//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleClear() {
//     setConcept("");
//     setLevel("beginner");
//     setAnswer("");
//     setError("");
//   }

//   return (
//     <main className="container">
//       <h1>AI 概念解释器</h1>

//       <form onSubmit={handleSubmit} className="form">
//         <label htmlFor="concept">
//           技术概念
//         </label>

//         <input
//           id="concept"
//           value={concept}
//           onChange={(event) => {
//             setConcept(event.target.value);
//           }}
//           placeholder="例如：RAG、Token、Embedding"
//           disabled={loading}
//         />

//         <label htmlFor="level">
//           学习难度
//         </label>

//         <select
//           id="level"
//           value={level}
//           onChange={(event) => {
//             setLevel(event.target.value as UserLevel);
//           }}
//           disabled={loading}
//         >
//           <option value="beginner">
//             初学者
//           </option>

//           <option value="advanced">
//             有经验的开发者
//           </option>
//         </select>

//         <div className="actions">
//           <button
//             type="submit"
//             disabled={loading || !concept.trim()}
//           >
//             {loading ? "正在生成..." : "开始解释"}
//           </button>

//           <button
//             type="button"
//             onClick={handleClear}
//             disabled={loading}
//           >
//             清空
//           </button>
//         </div>
//       </form>

//       {error && (
//         <p className="error" role="alert">
//           {error}
//         </p>
//       )}

//       {loading && (
//         <p className="loading" aria-live="polite">
//           AI 正在思考，请稍候...
//         </p>
//       )}

//       {answer && (
//         <article className="answer">
//           <h2>回答</h2>

//           <pre>{answer}</pre>
//         </article>
//       )}
//     </main>
//   );
// }

// day6 : 流式输出
"use client";

import { FormEvent, useRef, useState } from "react";

type UserLevel = "beginner" | "advanced";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<UserLevel>("beginner");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();

    if (!content || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content,
    };

    const assistantId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, assistantMessage]);
    setInput("");
    setError("");
    setLoading(true);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: text }) => ({
            role,
            content: text,
          })),
          level,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "请求失败");
      }

      if (!response.body) {
        throw new Error("浏览器不支持流式响应");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data:"));

          if (!dataLine) {
            continue;
          }

          const event = JSON.parse(
            dataLine.slice("data:".length).trim(),
          ) as StreamEvent;

          if (event.type === "delta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
          }

          if (event.type === "error") {
            throw new Error(event.message);
          }

          if (event.type === "done") {
            finished = true;
            break;
          }
        }
      }
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        setError("已停止生成");
      } else {
        setError(
          requestError instanceof Error ? requestError.message : "发生未知错误",
        );
      }
    } finally {
      controllerRef.current = null;
      setLoading(false);
    }
  }

  function handleStop() {
    controllerRef.current?.abort();
  }

  function handleClear() {
    controllerRef.current?.abort();
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  }

  return (
    <main className="page-shell">
      <section className="chat-panel" aria-label="AI 学习助手">
        <header className="panel-header">
          <div>
            <p className="eyebrow">DAY 07 / LLM BASICS</p>
            <h1>AI 学习助手</h1>
            <p className="subtitle">用对话复习 LLM、Prompt、RAG 和 Agent</p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={handleClear}
            disabled={loading && messages.length === 0}
          >
            清空对话
          </button>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <p className="empty-kicker">START HERE</p>
              <h2>今天想复习什么？</h2>
              <p>试试输入“解释 RAG”和“Token 与上下文窗口有什么关系”。</p>
            </div>
          )}

          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span className="message-role">
                {message.role === "user" ? "你" : "AI"}
              </span>
              <pre>{message.content || "正在生成..."}</pre>
            </article>
          ))}
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="question">问题</label>
          <textarea
            id="question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入你的问题..."
            rows={3}
            disabled={loading}
          />

          <div className="composer-footer">
            <label className="level-control" htmlFor="level">
              回答难度
              <select
                id="level"
                value={level}
                onChange={(event) => setLevel(event.target.value as UserLevel)}
                disabled={loading}
              >
                <option value="beginner">初学者</option>
                <option value="advanced">开发者</option>
              </select>
            </label>

            <div className="composer-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={handleStop}
                disabled={!loading}
              >
                停止生成
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={loading || !input.trim()}
              >
                {loading ? "生成中..." : "发送问题"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
