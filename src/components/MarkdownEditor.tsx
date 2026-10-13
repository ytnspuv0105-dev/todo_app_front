"use client";

import { useEffect, useId, useRef, useState } from "react";
import MarkdownView from "@/components/MarkdownView";
import { imageMarkdown, isRasterImageFile } from "@/lib/markdown";
import {
  insertAround,
  insertCodeBlock,
  insertImage,
  insertLink,
  insertTable,
  prefixLines,
  type EditResult,
} from "@/lib/markdownEdit";

type ImageUpload = (file: File) => Promise<{ id: number; filename: string } | null>;

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  token: string | null;
  workspaceId: number;
  preview?: boolean;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  className?: string;
  labelHidden?: boolean;
  imageUpload?: ImageUpload | null;
  onError?: (message: string) => void;
};

type Tool =
  | "bold"
  | "italic"
  | "strike"
  | "link"
  | "quote"
  | "ul"
  | "ol"
  | "task"
  | "code"
  | "codeblock"
  | "table";

const TOOLS: { id: Tool; label: string; title: string }[] = [
  { id: "bold", label: "太字", title: "太字" },
  { id: "italic", label: "斜体", title: "斜体" },
  { id: "strike", label: "取消", title: "取り消し線" },
  { id: "link", label: "リンク", title: "リンク" },
  { id: "quote", label: "引用", title: "引用" },
  { id: "ul", label: "箇条書き", title: "箇条書き" },
  { id: "ol", label: "番号", title: "番号付きリスト" },
  { id: "task", label: "チェック", title: "チェックリスト（- [ ] / - [x]）" },
  { id: "code", label: "コード", title: "インラインコード" },
  { id: "codeblock", label: "コードブロック", title: "コードブロック" },
  { id: "table", label: "表", title: "表" },
];

function applyTool(tool: Tool, value: string, start: number, end: number): EditResult {
  switch (tool) {
    case "bold":
      return insertAround(value, start, end, "**", "**", "太字");
    case "italic":
      return insertAround(value, start, end, "*", "*", "斜体");
    case "strike":
      return insertAround(value, start, end, "~~", "~~", "取り消し");
    case "link":
      return insertLink(value, start, end);
    case "quote":
      return prefixLines(value, start, end, () => "> ", "引用");
    case "ul":
      return prefixLines(value, start, end, () => "- ", "項目");
    case "ol":
      return prefixLines(value, start, end, (index) => `${index + 1}. `, "項目");
    case "task":
      return prefixLines(value, start, end, () => "- [ ] ", "項目");
    case "code":
      return insertAround(value, start, end, "`", "`", "コード");
    case "codeblock":
      return insertCodeBlock(value, start, end);
    case "table":
      return insertTable(value, start, end);
  }
}

export default function MarkdownEditor({
  label,
  value,
  onChange,
  token,
  workspaceId,
  preview = false,
  placeholder,
  maxLength,
  required = false,
  className,
  labelHidden = false,
  imageUpload = null,
  onError,
}: Props) {
  const reactId = useId();
  const labelId = `${reactId}-label`;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSel = useRef<{ start: number; end: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const sel = pendingSel.current;
    const el = areaRef.current;
    if (!sel || !el) return;
    el.focus();
    el.setSelectionRange(sel.start, sel.end);
    pendingSel.current = null;
  }, [value]);

  function commit(result: EditResult) {
    if (maxLength != null && result.value.length > maxLength) {
      onError?.("文字数の上限を超えるため挿入できません");
      return;
    }
    pendingSel.current = { start: result.selStart, end: result.selEnd };
    onChange(result.value);
  }

  function onTool(tool: Tool) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    commit(applyTool(tool, value, start, end));
  }

  async function onImage(file: File | null) {
    if (!file || !imageUpload) return;
    if (!isRasterImageFile(file)) {
      onError?.("画像は PNG、JPEG、GIF、WebP のみ挿入できます");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await imageUpload(file);
      if (!uploaded) return;
      const el = areaRef.current;
      const current = el?.value ?? value;
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      commit(insertImage(current, start, end, imageMarkdown(uploaded.filename, uploaded.id)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={["field", "md-field", className].filter(Boolean).join(" ")}>
      <span id={labelId} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </span>
      <div className="md-toolbar" role="toolbar" aria-label={`${label}の書式`}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="md-tool"
            title={tool.title}
            aria-label={tool.title}
            onClick={() => onTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
        <button
          type="button"
          className="md-tool"
          title={
            imageUpload
              ? "画像をアップロードして本文に挿入します。添付にも残ります"
              : "課題を保存してから画像を挿入できます"
          }
          aria-label="画像"
          disabled={!imageUpload || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "アップロード中" : "画像"}
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          aria-label="挿入する画像ファイル"
          onChange={(event) => onImage(event.target.files?.[0] ?? null)}
        />
      </div>
      <textarea
        ref={areaRef}
        aria-labelledby={labelId}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {preview && value.trim() ? (
        <div className="md-preview">
          <span className="md-preview-label">プレビュー</span>
          <MarkdownView source={value} token={token} workspaceId={workspaceId} />
        </div>
      ) : null}
    </div>
  );
}
