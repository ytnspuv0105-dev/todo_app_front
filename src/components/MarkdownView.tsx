"use client";

import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchAttachmentImageUrl } from "@/lib/api";
import { attachmentIdFromSrc, markdownUrlTransform, safeLinkHref } from "@/lib/markdown";

type Props = {
  source: string;
  token: string | null;
  workspaceId: number;
};

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const safe = safeLinkHref(href);
  if (!safe) return <span>{children}</span>;
  return (
    <a href={safe} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

function MarkdownCheckbox({ checked }: { checked?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled
      readOnly
      tabIndex={-1}
      aria-disabled="true"
      title="表示のみ。本文を編集して変更します"
      onClick={(event) => event.preventDefault()}
      onChange={() => undefined}
    />
  );
}

function AttachmentImage({
  token,
  workspaceId,
  attachmentId,
  alt,
}: {
  token: string | null;
  workspaceId: number;
  attachmentId: number;
  alt: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    setUrl(null);
    fetchAttachmentImageUrl(token, workspaceId, attachmentId)
      .then((next) => {
        objectUrl = next;
        if (!cancelled) setUrl(next);
        else URL.revokeObjectURL(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, workspaceId, attachmentId]);

  if (failed) {
    return <span className="md-image-note">{alt || "画像を表示できません"}</span>;
  }
  if (!url) {
    return <span className="md-image-note muted">{alt || "画像"}</span>;
  }
  return <img className="md-image" src={url} alt={alt} />;
}

function MarkdownImage({
  src,
  alt,
  token,
  workspaceId,
}: {
  src?: string;
  alt?: string;
  token: string | null;
  workspaceId: number;
}) {
  const id = attachmentIdFromSrc(src);
  const label = alt?.trim() || "画像";
  if (id == null) {
    return <span className="md-image-note">{label}（外部の画像は表示しません）</span>;
  }
  return (
    <AttachmentImage
      token={token}
      workspaceId={workspaceId}
      attachmentId={id}
      alt={label}
    />
  );
}

export default function MarkdownView({ source, token, workspaceId }: Props) {
  const components: Components = {
    a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
    img: ({ src, alt }) => (
      <MarkdownImage
        src={typeof src === "string" ? src : undefined}
        alt={alt}
        token={token}
        workspaceId={workspaceId}
      />
    ),
    input: ({ type, checked }) =>
      type === "checkbox" ? <MarkdownCheckbox checked={Boolean(checked)} /> : null,
    table: ({ children }) => (
      <div className="md-table-wrap">
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={markdownUrlTransform}
        disallowedElements={["script", "iframe", "object", "embed", "style", "link", "meta"]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
