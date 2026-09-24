# 系统架构

## 技术栈

- Next.js
- React
- TypeScript
- OpenAI Responses API
- Embeddings
- Supabase Auth
- PostgreSQL
- pgvector
- RLS
- Vitest
- Playwright
- Vercel

## 核心流程

用户上传文件
-> 文本解析
-> Chunk
-> Embedding
-> document_chunks

用户提问
-> Query Embedding
-> 向量检索
-> RAG Prompt
-> OpenAI 回答

Agent 请求
-> 模型决定工具
-> 服务端白名单校验
-> 执行工具
-> 返回工具结果
-> 生成最终回答