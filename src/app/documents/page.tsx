"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type UploadResult = {
  source: string;
  chunkCount: number;
};

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("请选择一个 Markdown 或 TXT 文件");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "文档上传失败");
      }

      setResult(data);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "文档上传失败",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h1>文档导入</h1>
      <p>上传 Markdown 或 TXT 文件，生成文本 Chunk 和 Embedding。</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <input
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          onChange={handleFileChange}
          disabled={loading}
        />

        {file && (
          <p>
            已选择：{file.name}（{Math.ceil(file.size / 1024)} KB）
          </p>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          style={{ marginTop: 16, padding: "8px 16px" }}
        >
          {loading ? "正在导入..." : "上传并导入"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "crimson", marginTop: 20 }}>
          {error}
        </p>
      )}

      {result && (
        <section style={{ marginTop: 20 }}>
          <h2>导入成功</h2>
          <p>文件：{result.source}</p>
          <p>Chunk 数量：{result.chunkCount}</p>
        </section>
      )}
    </main>
  );
}
