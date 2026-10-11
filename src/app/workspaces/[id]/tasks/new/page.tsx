"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Task,
  WorkspaceMember,
  createTask,
  listMembers,
  listTasks,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/labels";
import { formatTaskNumber } from "@/lib/taskDisplay";

export default function TaskCreatePage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [siblings, setSiblings] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [issueType, setIssueType] = useState("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [category, setCategory] = useState("");
  const [milestone, setMilestone] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [relatedNumbers, setRelatedNumbers] = useState("");

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, all] = await Promise.all([
          listMembers(token, workspaceId),
          listTasks(token, workspaceId),
        ]);
        if (cancelled) return;
        setMembers(m);
        setSiblings(all);
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
  }, [token, workspaceId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const related = relatedNumbers
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const task = await createTask(token, workspaceId, {
        issue_type: issueType,
        title: title.trim(),
        description,
        status,
        priority,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        due_date: dueDate || null,
        start_date: startDate || null,
        category: category || null,
        milestone: milestone || null,
        parent_number: parentNumber ? Number(parentNumber) : null,
        related_task_numbers: related,
      });
      router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="muted">読み込み中…</p>;
  }

  return (
    <>
      <p className="muted">
        <Link href={`/workspaces/${workspaceId}/tasks`}>← 課題一覧</Link>
      </p>
      <h2 className="hero-title" style={{ fontSize: "1.7rem" }}>
        課題を追加
      </h2>
      <p className="lede">新しい課題の内容を入力して作成します。</p>

      <section className="panel">
        <form className="task-form" onSubmit={onCreate}>
          <div className="grid-2">
            <label className="field">
              種別
              <select value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                {ISSUE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              状態
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
            />
          </label>

          <label className="field">
            詳細
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="grid-2">
            <label className="field">
              優先度
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              担当者
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              期限日
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              カテゴリー
              <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={120} />
            </label>
            <label className="field">
              マイルストーン
              <input
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              親課題
              <select
                value={parentNumber}
                onChange={(e) => setParentNumber(e.target.value)}
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
                onChange={(e) => setRelatedNumbers(e.target.value)}
                placeholder="例: 1, 3"
              />
            </label>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>
              作成
            </button>
            <Link className="btn btn-ghost" href={`/workspaces/${workspaceId}/tasks`}>
              キャンセル
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}
