import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { embedTexts } from "@/lib/embeddings";
import { splitText } from "@/lib/chunking";
import { getRequiredUser, UnauthorizedError } from "@/lib/auth-user";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

function isAllowedFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();

  return (
    ALLOWED_TYPES.has(file.type) ||
    extension === "txt" ||
    extension === "md" ||
    extension === "markdown"
  );
}

export async function POST(request: Request) {
  const { supabase, user } = await getRequiredUser();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: "只支持 Markdown 或 TXT 文件" },
        { status: 415 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "文件不能超过 5 MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // console.log("buffer111", buffer);

    const sourceHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const text = buffer.toString("utf8").trim();
    // console.log("text111", text);

    if (!text) {
      return NextResponse.json({ error: "不能上传空文档" }, { status: 400 });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_hash", sourceHash)
      .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (duplicate) {
      return NextResponse.json(
        { error: "该文件已经上传过了" },
        { status: 409 },
      );
    }

    const chunks = splitText(text, 500, 80);
    // console.log('chunks111',chunks);

    const embeddings = await embedTexts(chunks.map((content) => content));
    // console.log('embeddings111',embeddings);

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename: file.name,
        source_hash: sourceHash,
      })
      .select("id")
      .single();

    if (documentError || !document) {
      throw documentError ?? new Error("文档记录创建失败");
    }

    const rows = chunks.map((content, index) => ({
      document_id: document.id,
      source: file.name,
      title: file.name,
      content,
      embedding: embeddings[index],
      metadata: {
        sourceHash,
        chunkIndex: index,
        fileType: file.type || "text/plain",
      },
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      source: file.name,
      chunkCount: rows.length,
    });
  } catch (error) {
    console.error("document import failed", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "文档导入失败，请稍后重试" },
      { status: 500 },
    );
  }
}
