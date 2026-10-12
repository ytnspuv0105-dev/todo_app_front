"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Task,
  TaskComment,
  WorkspaceMember,
  downloadAttachment,
  deleteAttachment,
  deleteTask,
  getTask,
  listComments,
  listMembers,
  listTasks,
  updateComment,
  updateTask,
  uploadAttachment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/labels";
import { formatTaskNumber, formatUpdatedAt } from "@/lib/taskDisplay";

export default function TaskDetailPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const taskId = Number(params.taskId);
  const { token, user } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [siblings, setSiblings] = useState<Task[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveNoticeRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!saveNotice) return;
    const el = saveNoticeRef.current;
    if (!el) return;

    // Scroll every container that actually moves (inner overflow + document).
    // Avoid scrollIntoView here — it fights scroll-to-top when content sits above the notice.
    const targets: Element[] = [];
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const overflow = style.overflow;
      const canScrollY =
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflow === "auto" ||
          overflow === "scroll") &&
        node.scrollHeight > node.clientHeight + 1;
      if (canScrollY) targets.push(node);
      node = node.parentElement;
    }
    const root = document.scrollingElement ?? document.documentElement;
    if (!targets.includes(root)) targets.push(root);

    for (const target of targets) {
      target.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }, [saveNotice]);

  const [issueType, setIssueType] = useState("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [category, setCategory] = useState("");
  const [milestone, setMilestone] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [relatedNumbers, setRelatedNumbers] = useState("");

  function beginEdit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaveNotice(null);
      setter(value);
    };
  }

  useEffect(() => {
    setSaveNotice(null);
  }, [workspaceId, taskId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [t, m, all, c] = await Promise.all([
          getTask(token, workspaceId, taskId),
          listMembers(token, workspaceId),
          listTasks(token, workspaceId),
          listComments(token, workspaceId, taskId),
        ]);
        if (cancelled) return;
        setTask(t);
        setMembers(m);
        setSiblings(all.filter((x) => x.id !== taskId));
        setComments(c);
        setIssueType(t.issue_type);
        setTitle(t.title);
        setDescription(t.description);
        setStatus(t.status);
        setPriority(t.priority);
        setAssigneeId(t.assignee_id ? String(t.assignee_id) : "");
        setDueDate(t.due_date ?? "");
        setStartDate(t.start_date ?? "");
        setCategory(t.category ?? "");
        setMilestone(t.milestone ?? "");
        setParentNumber(t.parent_number != null ? String(t.parent_number) : "");
        setRelatedNumbers((t.related_task_numbers ?? []).join(", "));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, workspaceId, taskId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const related = relatedNumbers
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const payload: Record<string, unknown> = {
        issue_type: issueType,
        title: title.trim(),
        description,
        status,
        priority,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        clear_assignee: !assigneeId,
        due_date: dueDate || null,
        clear_due_date: !dueDate,
        start_date: startDate || null,
        clear_start_date: !startDate,
        category: category || null,
        clear_category: !category,
        milestone: milestone || null,
        clear_milestone: !milestone,
        parent_number: parentNumber ? Number(parentNumber) : null,
        clear_parent: !parentNumber,
        related_task_numbers: related,
      };
      const trimmedComment = commentBody.trim();
      if (trimmedComment) payload.comment = trimmedComment;

      const updated = await updateTask(token, workspaceId, taskId, payload);
      setTask(updated);
      if (trimmedComment) {
        const refreshed = await listComments(token, workspaceId, taskId);
        setComments(refreshed);
        setCommentBody("");
      }
      setSaveNotice("更新しました");
    } catch (err) {
      setSaveNotice(null);
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!token || !confirm("この課題を削除しますか？")) return;
    try {
      await deleteTask(token, workspaceId, taskId);
      router.push(`/workspaces/${workspaceId}/tasks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  async function onUpload(file: File | null) {
    if (!token || !file) return;
    setError(null);
    try {
      const att = await uploadAttachment(token, workspaceId, taskId, file);
      setTask((prev) =>
        prev ? { ...prev, attachments: [...prev.attachments, att] } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    }
  }

  async function onRemoveAttachment(id: number) {
    if (!token) return;
    try {
      await deleteAttachment(token, workspaceId, id);
      setTask((prev) =>
        prev
          ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "添付の削除に失敗しました");
    }
  }

  async function onSaveCommentEdit(commentId: number) {
    if (!token || !editingBody.trim()) return;
    setEditBusy(true);
    setError(null);
    try {
      const updated = await updateComment(
        token,
        workspaceId,
        taskId,
        commentId,
        editingBody.trim(),
      );
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "コメントの編集に失敗しました");
    } finally {
      setEditBusy(false);
    }
  }

  if (loading) {
    return <p className="muted">読み込み中…</p>;
  }

  return (
    <>
      <p className="muted">
        <Link href={`/workspaces/${workspaceId}/tasks`}>← 課題一覧</Link>
        {" · "}
        <Link href={`/workspaces/${workspaceId}`}>ダッシュボード</Link>
      </p>
      {saveNotice ? (
        <p className="save-notice" role="status" ref={saveNoticeRef}>
          {saveNotice}
        </p>
      ) : null}
      <div className="task-detail-head">
        <span className="task-number task-number-lg" aria-label="課題番号">
          {task ? formatTaskNumber(task.number) : "…"}
        </span>
        <h2 className="hero-title" style={{ fontSize: "1.7rem", margin: 0 }}>
          {title || "課題"}
        </h2>
      </div>

      <section className="panel">
        <form className="task-form" onSubmit={onSave}>
          <div className="grid-2">
            <label className="field">
              種別
              <select
                value={issueType}
                onChange={(e) => beginEdit(setIssueType)(e.target.value)}
              >
                {ISSUE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              状態
              <select
                value={status}
                onChange={(e) => beginEdit(setStatus)(e.target.value)}
              >
                {STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            件名
            <input
              value={title}
              onChange={(e) => beginEdit(setTitle)(e.target.value)}
              required
              maxLength={500}
            />
          </label>

          <label className="field">
            詳細
            <textarea
              value={description}
              onChange={(e) => beginEdit(setDescription)(e.target.value)}
            />
          </label>

          <div className="grid-2">
            <label className="field">
              優先度
              <select
                value={priority}
                onChange={(e) => beginEdit(setPriority)(e.target.value)}
              >
                {PRIORITIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              担当者
              <select
                value={assigneeId}
                onChange={(e) => beginEdit(setAssigneeId)(e.target.value)}
              >
                <option value="">未設定</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              開始日
              <input
                type="date"
                value={startDate}
                onChange={(e) => beginEdit(setStartDate)(e.target.value)}
              />
            </label>
            <label className="field">
              期限日
              <input
                type="date"
                value={dueDate}
                onChange={(e) => beginEdit(setDueDate)(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              カテゴリー
              <input
                value={category}
                onChange={(e) => beginEdit(setCategory)(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="field">
              マイルストーン
              <input
                value={milestone}
                onChange={(e) => beginEdit(setMilestone)(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              親課題
              <select
                value={parentNumber}
                onChange={(e) => beginEdit(setParentNumber)(e.target.value)}
              >
                <option value="">なし</option>
                {siblings.map((s) => (
                  <option key={s.id} value={s.number}>
                    {formatTaskNumber(s.number)} {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              関連課題（番号をカンマ区切り）
              <input
                value={relatedNumbers}
                onChange={(e) => beginEdit(setRelatedNumbers)(e.target.value)}
                placeholder="例: 1, 3"
              />
            </label>
          </div>

          {task?.child_numbers?.length ? (
            <p className="muted">
              子課題: {task.child_numbers.map((n) => formatTaskNumber(n)).join(", ")}
            </p>
          ) : null}

          <label className="field comment-form">
            コメントを追加（任意）
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              maxLength={5000}
              placeholder="同じ保存で課題の変更と一緒に投稿できます"
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              保存
            </button>
            <button className="btn btn-danger" type="button" onClick={onDelete}>
              削除
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack" style={{ marginTop: "1rem" }}>
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>コメント</h3>
          <span className="muted">{comments.length} 件</span>
        </div>
        {comments.length === 0 ? (
          <p className="empty">まだコメントはありません</p>
        ) : (
          <ul className="comment-thread">
            {comments.map((c) => {
              const mine = user && c.author_id === user.id;
              const editing = editingCommentId === c.id;
              return (
                <li key={c.id} className="comment-item">
                  <div className="comment-item-head">
                    <span className="comment-author">
                      {c.author_name?.trim() || "不明なユーザー"}
                    </span>
                    {mine && !editing ? (
                      <button
                        type="button"
                        className="btn btn-ghost comment-edit-btn"
                        onClick={() => {
                          setEditingCommentId(c.id);
                          setEditingBody(c.body);
                        }}
                      >
                        編集
                      </button>
                    ) : null}
                    <span className="comment-time muted">
                      {formatUpdatedAt(c.updated_at ?? c.created_at)}
                      {c.updated_at ? "（編集済み）" : ""}
                    </span>
                  </div>
                  {editing ? (
                    <div className="stack comment-form">
                      <textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        maxLength={5000}
                        required
                      />
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={editBusy || !editingBody.trim()}
                          onClick={() => onSaveCommentEdit(c.id)}
                        >
                          コメントを更新
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={editBusy}
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingBody("");
                          }}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-body">{c.body}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel stack" style={{ marginTop: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>添付ファイル</h3>
        <label className="field">
          ファイルを追加
          <input
            type="file"
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="attachments">
          {(task?.attachments ?? []).length === 0 ? (
            <p className="muted">添付はありません</p>
          ) : (
            task?.attachments.map((a) => (
              <div key={a.id} className="attach-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    token &&
                    downloadAttachment(token, workspaceId, a.id, a.filename).catch(
                      (err) =>
                        setError(
                          err instanceof Error
                            ? err.message
                            : "ダウンロードに失敗しました",
                        ),
                    )
                  }
                >
                  {a.filename}（{a.size_bytes} bytes）
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onRemoveAttachment(a.id)}
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
