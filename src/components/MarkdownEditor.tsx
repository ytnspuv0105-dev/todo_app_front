"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

function ToolIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="md-tool-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      {children}
    </svg>
  );
}

function LinkMark() {
  return (
    <ToolIcon>
      <path
        d="M6.7 9.3a2.6 2.6 0 0 0 3.7.1l1.6-1.6a2.6 2.6 0 0 0-3.7-3.7L7.4 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M9.3 6.7a2.6 2.6 0 0 0-3.7-.1L4 8.2a2.6 2.6 0 0 0 3.7 3.7l.9-.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </ToolIcon>
  );
}

function TableMark() {
  return (
    <ToolIcon>
      <rect x="1.6" y="2.2" width="12.8" height="11.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.6 6.2h12.8M1.6 10h12.8M6.4 2.2v11.6M10.2 2.2v11.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </ToolIcon>
  );
}

function BulletListMark() {
  return (
    <svg className="md-tool-icon md-list-icon" viewBox="0 0 18 16" width="22" height="20" aria-hidden="true">
      <circle cx="2.1" cy="3.1" r="1.15" fill="currentColor" />
      <circle cx="2.1" cy="8" r="1.15" fill="currentColor" />
      <circle cx="2.1" cy="12.9" r="1.15" fill="currentColor" />
      <path
        d="M5.2 3.1H16.4M5.2 8H16.4M5.2 12.9H16.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NumberListMark() {
  return (
    <svg className="md-tool-icon md-list-icon" viewBox="0 0 18 16" width="22" height="20" aria-hidden="true">
      <g
        fill="currentColor"
        fontSize="5.2"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        <text x="0.2" y="4.7">1</text>
        <text x="0.2" y="9.6">2</text>
        <text x="0.2" y="14.5">3</text>
      </g>
      <path
        d="M5.6 3.1H16.6M5.6 8H16.6M5.6 12.9H16.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageMark() {
  return (
    <ToolIcon>
      <rect x="1.6" y="2.4" width="12.8" height="11.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.2" cy="6" r="1.15" fill="currentColor" />
      <path
        d="M2.4 12.2 5.8 8.6l2.2 2 2.1-2.4 3.1 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </ToolIcon>
  );
}

const TOOLS: { id: Tool; face: ReactNode; title: string; className?: string }[] = [
  { id: "bold", face: "B", title: "太字", className: "md-tool-bold" },
  { id: "italic", face: "I", title: "斜体", className: "md-tool-italic" },
  { id: "strike", face: "S", title: "取り消し線", className: "md-tool-strike" },
  { id: "link", face: <LinkMark />, title: "リンク" },
  { id: "quote", face: "“", title: "引用" },
  { id: "ul", face: <BulletListMark />, title: "箇条書き" },
  { id: "ol", face: <NumberListMark />, title: "番号" },
  { id: "task", face: "☑", title: "チェック" },
  { id: "code", face: "</>", title: "インラインコード" },
  { id: "codeblock", face: "{ }", title: "コードブロック" },
  { id: "table", face: <TableMark />, title: "表" },
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
            className={["md-tool", tool.className].filter(Boolean).join(" ")}
            title={tool.title}
            aria-label={tool.title}
            onClick={() => onTool(tool.id)}
          >
            {tool.face}
          </button>
        ))}
        <button
          type="button"
          className="md-tool"
          title="画像"
          aria-label="画像"
          aria-busy={uploading || undefined}
          disabled={!imageUpload || uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImageMark />
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
