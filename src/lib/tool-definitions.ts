export const tools = [
  {
    type: "function" as const,
    name: "searchKnowledgeBase",
    description: "搜索用户上传的知识库，返回相关文档片段",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "要搜索的问题",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "saveNote",
    description: "保存一条学习笔记",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "笔记标题",
        },
        content: {
          type: "string",
          description: "笔记内容",
        },
      },
      required: ["title", "content"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "createTodo",
    description: "创建一个学习待办事项",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "待办事项标题",
        },
        dueDate: {
          type: "string",
          description: "截止日期，格式为 YYYY-MM-DD；没有截止日期时传空字符串",
        },
      },
      required: ["title", "dueDate"],
      additionalProperties: false,
    },
    strict: true,
  },
];
