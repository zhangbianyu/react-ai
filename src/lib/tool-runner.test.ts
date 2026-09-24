import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/lib/auth-user";

const mockUserContext = {
  user: { id: "user-1" },
  userId: "user-1",
  supabase: {},
} as unknown as UserContext;

vi.mock("@/lib/openai-client", () => ({
  openaiClient: {
    embeddings: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

import { runTool } from "@/lib/tool-runner";

describe("tool-runner", () => {
  it("非法工具名称应该被拒绝", async () => {
    await expect(runTool("deleteAllData", {}, mockUserContext)).rejects.toThrow(
      "不允许调用工具",
    );
  });

  it("saveNote 空标题应该被拒绝", async () => {
    await expect(
      runTool(
        "saveNote",
        {
          title: "",
          content: "测试内容",
        },
        mockUserContext,
      ),
    ).rejects.toThrow("saveNote 参数无效");
  });

  it("saveNote 空内容应该被拒绝", async () => {
    await expect(
      runTool(
        "saveNote",
        {
          title: "测试标题",
          content: "",
        },
        mockUserContext,
      ),
    ).rejects.toThrow("saveNote 参数无效");
  });

  it("createTodo 非法日期应该被拒绝", async () => {
    await expect(
      runTool(
        "createTodo",
        {
          title: "完成 RAG 评测",
          dueDate: "2026/09/25",
        },
        mockUserContext,
      ),
    ).rejects.toThrow("createTodo 参数无效");
  });

  it("工具参数包含未知字段时应该被拒绝", async () => {
    await expect(
      runTool(
        "saveNote",
        {
          title: "RAG",
          content: "内容",
          deleteAll: true,
        },
        mockUserContext,
      ),
    ).rejects.toThrow("saveNote 参数无效");
  });
});
