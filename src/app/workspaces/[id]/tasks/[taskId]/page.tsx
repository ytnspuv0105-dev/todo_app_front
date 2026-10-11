"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Task,
  WorkspaceMember,
  downloadAttachment,
  deleteAttachment,
  deleteTask,
  getTask,
  listMembers,
  listTasks,
  updateTask,
  uploadAttachment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/labels";
import { formatTaskNumber } from "@/lib/taskDisplay";

export default function TaskDetailPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const taskId = Number(params.taskId);
  const { token } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [siblings, setSiblings] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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
        const [t, m, all] = await Promise.all([
          getTask(token, workspaceId, taskId),
          listMembers(token, workspaceId),
          listTasks(token, workspaceId),
        ]);
        if (cancelled) return;
        setTask(t);
        setMembers(m);
        setSiblings(all.filter((x) => x.id !== taskId));
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

      const updated = await updateTask(token, workspaceId, taskId, {
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
      });
      setTask(updated);
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
        <p className="save-notice" role="status">
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
