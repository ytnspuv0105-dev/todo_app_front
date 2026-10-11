"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TaskTable from "@/components/TaskTable";
import { Task, listTasks } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, STATUSES, labelOf } from "@/lib/labels";

const UNASSIGNED = "__unassigned__";

export default function TaskListPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [issueType, setIssueType] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listTasks(token, workspaceId);
        if (!cancelled) setTasks(data);
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

  const issueTypeOptions = useMemo(() => {
    const values = [...new Set(tasks.map((t) => t.issue_type))].sort();
    return values.map((value) => ({
      value,
      label: labelOf(ISSUE_TYPES, value),
    }));
  }, [tasks]);

  const statusOptions = useMemo(() => {
    const values = [...new Set(tasks.map((t) => t.status))].sort();
    return values.map((value) => ({
      value,
      label: labelOf(STATUSES, value),
    }));
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<number, string>();
    let hasUnassigned = false;
    for (const t of tasks) {
      if (t.assignee_id == null) {
        hasUnassigned = true;
        continue;
      }
      if (!map.has(t.assignee_id)) {
        map.set(t.assignee_id, t.assignee_name ?? `ユーザー #${t.assignee_id}`);
      }
    }
    const named = [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "ja"))
      .map(([id, name]) => ({ value: String(id), label: name }));
    return hasUnassigned
      ? [{ value: UNASSIGNED, label: "未設定" }, ...named]
      : named;
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (issueType && t.issue_type !== issueType) return false;
      if (status && t.status !== status) return false;
      if (assignee === UNASSIGNED) {
        if (t.assignee_id != null) return false;
      } else if (assignee) {
        if (String(t.assignee_id) !== assignee) return false;
      }
      return true;
    });
  }, [tasks, issueType, status, assignee]);

  const filtersActive = Boolean(issueType || status || assignee);

  function clearFilters() {
    setIssueType("");
    setStatus("");
    setAssignee("");
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h2 className="hero-title" style={{ fontSize: "1.7rem" }}>
            課題一覧
          </h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            ワークスペース内の課題をすべて表示します。
          </p>
        </div>
        <Link className="btn btn-primary" href={`/workspaces/${workspaceId}/tasks/new`}>
          課題を追加
        </Link>
      </div>

      <section className="panel stack">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>すべての課題</h3>
          <span className="muted">
            {loading ? "…" : `${filtered.length} / ${tasks.length} 件`}
          </span>
        </div>

        {!loading && tasks.length > 0 ? (
          <div className="task-filters" role="group" aria-label="課題の絞り込み">
            <label className="task-filter">
              種別
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option value="">すべて</option>
                {issueTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="task-filter">
              状態
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">すべて</option>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="task-filter">
              担当者
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">すべて</option>
                {assigneeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                クリア
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">課題はまだありません</p>
        ) : filtered.length === 0 ? (
          <p className="empty">条件に一致する課題はありません</p>
        ) : (
          <TaskTable tasks={filtered} workspaceId={workspaceId} />
        )}
      </section>
    </>
  );
}
