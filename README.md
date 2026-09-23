# AI 学习助手

这是一个使用 Next.js、React 和 OpenAI Responses API 构建的最小流式聊天应用。

## 今天完成的内容

- React 受控表单和状态管理
- 多轮对话历史
- `fetch` 调用 Next.js Route Handler
- Responses API 流式输出
- SSE 事件解析
- 停止生成和清空对话
- 服务端环境变量和错误处理

## 环境要求

- Node.js 20 或更高版本
- 一个可以调用目标模型的 OpenAI API Key

## 安装和运行

```powershell
npm install
Copy-Item .env.local.example .env.local
```

编辑 `.env.local`：

```env
OPENAI_API_KEY=你的_API_Key
OPENAI_MODEL=你的可用模型名称
```

启动开发服务器：

```powershell
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

修改 `.env.local` 后，需要重启开发服务器。

## 请求流程

```text
React 输入框
  -> POST /api/chat
  -> 服务端读取 OPENAI_API_KEY
  -> Responses API stream: true
  -> response.output_text.delta
  -> SSE data 事件
  -> React 逐段追加回答
```

## 目录结构

```text
src/
  app/
    api/chat/route.ts  # 服务端流式接口
    globals.css        # 页面样式
    layout.tsx         # 根布局
    page.tsx           # React 聊天页面
```

## 安全注意事项

- API Key 只放在 `.env.local`，不要使用 `NEXT_PUBLIC_` 前缀。
- `.env.local` 已加入 `.gitignore`。
- 不要把 API Key 写入 React 客户端代码。
- 生产环境还需要加入登录、限流、日志、成本统计和内容安全处理。

## 自测清单

- [ ] 输入问题后，回答逐段显示
- [ ] 可以选择初学者或开发者难度
- [ ] 可以停止生成
- [ ] 可以清空对话
- [ ] 空输入不会发送请求
- [ ] 错误 API Key 会显示错误
- [ ] 连续提问时，模型能使用前面的对话上下文

## 官方参考

- [OpenAI Developer Quickstart](https://developers.openai.com/api/docs/quickstart)
- [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses)
