"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TaskTable, { NumberSort } from "@/components/TaskTable";
import { Task, listTasks } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, STATUSES, labelOf } from "@/lib/labels";

const UNASSIGNED = "__unassigned__";

function TaskListContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = Number(params.id);
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [titleQuery, setTitleQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [issueType, setIssueType] = useState(
    () => searchParams.get("issue_type") ?? "",
  );
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [assignee, setAssignee] = useState(
    () => searchParams.get("assignee") ?? "",
  );
  const [numberSort, setNumberSort] = useState<NumberSort>(null);

  // Dashboard「自分の担当」link passes ?assignee=… after first paint.
  useEffect(() => {
    const nextAssignee = searchParams.get("assignee") ?? "";
    const nextQ = searchParams.get("q") ?? "";
    const nextIssue = searchParams.get("issue_type") ?? "";
    const nextStatus = searchParams.get("status") ?? "";
    setAssignee(nextAssignee);
    setTitleQuery(nextQ);
    setIssueType(nextIssue);
    setStatus(nextStatus);
  }, [searchParams]);

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
        map.set(t.assignee_id, t.assignee_name ?? `ユーザー ${t.assignee_id}`);
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
    const needle = titleQuery.trim().toLocaleLowerCase("ja");
    const rows = tasks.filter((t) => {
      if (needle && !t.title.toLocaleLowerCase("ja").includes(needle)) {
        return false;
      }
      if (issueType && t.issue_type !== issueType) return false;
      if (status && t.status !== status) return false;
      if (assignee === UNASSIGNED) {
        if (t.assignee_id != null) return false;
      } else if (assignee) {
        if (String(t.assignee_id) !== assignee) return false;
      }
      return true;
    });

    const sorted = [...rows];
    if (numberSort === "asc") {
      sorted.sort((a, b) => a.number - b.number);
    } else if (numberSort === "desc") {
      sorted.sort((a, b) => b.number - a.number);
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return sorted;
  }, [tasks, titleQuery, issueType, status, assignee, numberSort]);

  const filtersActive = Boolean(titleQuery.trim() || issueType || status || assignee);

  function clearFilters() {
    setTitleQuery("");
    setIssueType("");
    setStatus("");
    setAssignee("");
  }

  function toggleNumberSort() {
    setNumberSort((prev) => {
      if (prev === null || prev === "desc") return "asc";
      return "desc";
    });
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
            <label className="task-filter task-filter-search">
              件名
              <input
                type="search"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                placeholder="件名で検索"
                autoComplete="off"
              />
            </label>
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
          <TaskTable
            tasks={filtered}
            workspaceId={workspaceId}
            numberSort={numberSort}
            onToggleNumberSort={toggleNumberSort}
          />
        )}
      </section>
    </>
  );
}

export default function TaskListPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中…</p>}>
      <TaskListContent />
    </Suspense>
  );
}
