const markdown = `
# React 学习笔记

React 是一个用于构建用户界面的 JavaScript 库。

## 组件

组件是 React 应用的基本组成单位。
组件可以接收输入，并返回一段界面描述。

一个组件通常是一个 JavaScript 函数：

function Welcome() {
  return <h1>Hello React</h1>;
}

## Props

Props 用于从父组件向子组件传递数据。
Props 是只读的，子组件不应该直接修改 Props。

function UserCard({ name }) {
  return <div>{name}</div>;
}

## State

State 用于保存组件内部会变化的数据。
当 State 发生变化时，React 通常会重新渲染组件。

const [count, setCount] = useState(0);

## Hooks

Hooks 是以 use 开头的特殊函数。
常见的 Hooks 包括 useState、useEffect 和 useMemo。
`.trim();

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getHeadingTitle(lines) {
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));

  if (!heading) {
    return "未命名章节";
  }

  return heading.replace(/^#{1,6}\s+/, "").trim();
}

function splitLongText(text, maxChars, overlap) {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function splitMarkdown(markdownText, options = {}) {
  const { source = "unknown.md", maxChars = 500, overlap = 80 } = options;

  if (overlap >= maxChars) {
    throw new Error("overlap 必须小于 maxChars");
  }

  const text = normalizeText(markdownText);
  const lines = text.split("\n");

  const sections = [];
  let currentSection = [];

  function flushSection() {
    if (currentSection.length === 0) {
      return;
    }

    const sectionText = currentSection.join("\n").trim();

    if (!sectionText) {
      currentSection = [];
      return;
    }

    sections.push({
      title: getHeadingTitle(currentSection),
      text: sectionText,
    });

    currentSection = [];
  }

  for (const line of lines) {
    const isHeading = /^#{1,6}\s+/.test(line);

    if (isHeading && currentSection.length > 0) {
      flushSection();
    }

    currentSection.push(line);
  }

  flushSection();

  const chunks = [];

  for (const section of sections) {
    const paragraphs = section.text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    let currentText = "";

    function flushChunk() {
      const chunkText = currentText.trim();

      if (!chunkText) {
        return;
      }

      chunks.push({
        text: chunkText,
        title: section.title,
        source,
        charCount: chunkText.length,
      });

      currentText = "";
    }

    for (const paragraph of paragraphs) {
      const candidate = currentText
        ? `${currentText}\n\n${paragraph}`
        : paragraph;

      if (candidate.length <= maxChars) {
        currentText = candidate;
        continue;
      }

      flushChunk();

      if (paragraph.length <= maxChars) {
        currentText = paragraph;
        continue;
      }

      const longChunks = splitLongText(paragraph, maxChars, overlap);

      for (const longChunk of longChunks) {
        chunks.push({
          text: longChunk,
          title: section.title,
          source,
          charCount: longChunk.length,
        });
      }
    }

    flushChunk();
  }

  return chunks.map((chunk, index) => ({
    id: `${source}:${index + 1}`,
    index,
    ...chunk,
  }));
}

export const chunks = splitMarkdown(markdown, {
  source: "react-notes.md",
  maxChars: 180,
  overlap: 40,
});

console.log(`共切分出 ${chunks.length} 个 Chunk`);

for (const chunk of chunks) {
  console.log("\n--------------------");
  console.log(`ID：${chunk.id}`);
  console.log(`标题：${chunk.title}`);
  console.log(`字符数：${chunk.charCount}`);
  console.log(`内容：\n${chunk.text}`);
}
