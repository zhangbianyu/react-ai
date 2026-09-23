export function splitText(
  text: string,
  maxChars = 500,
  overlap = 80,
): string[] {
  if (!text.trim()) {
    return [];
  }

  if (maxChars <= 0) {
    throw new Error("maxChars 必须大于 0");
  }

  if (overlap < 0 || overlap >= maxChars) {
    throw new Error("overlap 必须大于等于 0 且小于 maxChars");
  }

  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const chunks: string[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + maxChars, normalizedText.length);

    // 尽量在段落边界切分，避免从句子中间切开
    if (end < normalizedText.length) {
      const paragraphBoundary = normalizedText.lastIndexOf("\n\n", end);

      if (paragraphBoundary > start + maxChars * 0.5) {
        end = paragraphBoundary;
      }
    }

    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}
