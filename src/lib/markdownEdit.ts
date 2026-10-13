export type EditResult = {
  value: string;
  selStart: number;
  selEnd: number;
};

function bounds(value: string, start: number, end: number) {
  const len = value.length;
  const a = Math.max(0, Math.min(start, len));
  const b = Math.max(0, Math.min(end, len));
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function insertAround(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): EditResult {
  const span = bounds(value, start, end);
  const selected = value.slice(span.start, span.end);
  const body = selected.length > 0 ? selected : placeholder;
  const next = value.slice(0, span.start) + before + body + after + value.slice(span.end);
  const selStart = span.start + before.length;
  return { value: next, selStart, selEnd: selStart + body.length };
}

export function insertLink(value: string, start: number, end: number): EditResult {
  const span = bounds(value, start, end);
  const selected = value.slice(span.start, span.end);
  const text = selected.length > 0 ? selected : "表示テキスト";
  const url = "https://";
  const next = `${value.slice(0, span.start)}[${text}](${url})${value.slice(span.end)}`;
  const selStart = span.start + text.length + 3;
  return { value: next, selStart, selEnd: selStart + url.length };
}

export function prefixLines(
  value: string,
  start: number,
  end: number,
  prefixFor: (index: number) => string,
  placeholder: string,
): EditResult {
  const span = bounds(value, start, end);
  const lineStart = value.lastIndexOf("\n", Math.max(0, span.start - 1)) + 1;
  let lineEnd = value.indexOf("\n", span.end);
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  const nextBlock = block
    .split("\n")
    .map((line, index) => {
      const content = line.length > 0 ? line : placeholder;
      return `${prefixFor(index)}${content}`;
    })
    .join("\n");
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  return { value: next, selStart: lineStart, selEnd: lineStart + nextBlock.length };
}

export function insertBlock(
  value: string,
  start: number,
  end: number,
  block: string,
  select?: { start: number; end: number },
): EditResult {
  const span = bounds(value, start, end);
  const before = value.slice(0, span.start);
  const after = value.slice(span.end);
  const lead = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const trail = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
  const inserted = `${lead}${block}${trail}`;
  const next = before + inserted + after;
  const base = span.start + lead.length;
  if (select) {
    return { value: next, selStart: base + select.start, selEnd: base + select.end };
  }
  return { value: next, selStart: base, selEnd: base + block.length };
}

export function insertCodeBlock(value: string, start: number, end: number): EditResult {
  const span = bounds(value, start, end);
  const selected = value.slice(span.start, span.end);
  const body = selected.length > 0 ? selected : "コード";
  const block = `\`\`\`\n${body}\n\`\`\``;
  return insertBlock(value, span.start, span.end, block, { start: 4, end: 4 + body.length });
}

export function insertTable(value: string, start: number, end: number): EditResult {
  const block = "| 列1 | 列2 |\n| --- | --- |\n| セル | セル |";
  return insertBlock(value, start, end, block);
}

export function insertImage(value: string, start: number, end: number, markdown: string): EditResult {
  return insertBlock(value, start, end, markdown);
}
