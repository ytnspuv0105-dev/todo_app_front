"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import RequireAuth from "@/components/RequireAuth";
import {
  Task,
  Workspace,
  WorkspaceMember,
  createInvite,
  createTask,
  listMembers,
  listTasks,
  getWorkspace,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ISSUE_TYPES, PRIORITIES, STATUSES, labelOf } from "@/lib/labels";

export default function WorkspacePage() {
  return (
    <RequireAuth>
      <WorkspaceInner />
    </RequireAuth>
  );
}

function WorkspaceInner() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token } = useAuth();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [w, t, m] = await Promise.all([
          getWorkspace(token, workspaceId),
          listTasks(token, workspaceId),
          listMembers(token, workspaceId),
        ]);
        if (!cancelled) {
          setWs(w);
          setTasks(t);
          setMembers(m);
        }
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

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const task = await createTask(token, workspaceId, {
        title: title.trim(),
        issue_type: "task",
        status: "open",
        priority: "medium",
      });
      setTasks((prev) => [task, ...prev]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite() {
    if (!token) return;
    setError(null);
    try {
      const inv = await createInvite(token, workspaceId, "worker");
      const url = `${window.location.origin}${inv.invite_path}`;
      setInviteUrl(url);
      await navigator.clipboard.writeText(url).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待の作成に失敗しました");
    }
  }

  return (
    <div className="shell">
      <AppHeader />
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : (
        <>
          <div className="section-head">
            <div>
              <p className="muted" style={{ margin: "0 0 0.25rem" }}>
                <Link href="/workspaces">ワークスペース</Link>
              </p>
              <h2 className="hero-title" style={{ fontSize: "1.8rem" }}>
                {ws?.name ?? "ワークスペース"}
              </h2>
            </div>
            {ws?.my_role === "admin" ? (
              <button type="button" className="btn btn-ghost" onClick={onInvite}>
                招待リンクを発行
              </button>
            ) : null}
          </div>

          {inviteUrl ? (
            <p className="panel muted" style={{ marginBottom: "1rem" }}>
              招待リンク（クリップボードにコピー済み）: <code>{inviteUrl}</code>
            </p>
          ) : null}

          <section className="panel stack" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>メンバー</h3>
            <div className="row">
              {members.map((m) => (
                <span key={m.id} className="badge">
                  {m.display_name}（{m.role === "admin" ? "管理者" : "メンバー"}）
                </span>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-head">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>課題一覧</h3>
              <span className="muted">{tasks.length} 件</span>
            </div>

            <form className="row" onSubmit={onCreateTask}>
              <input
                style={{ flex: 1, minWidth: 0 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="新しい課題の件名"
                maxLength={500}
              />
              <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>
                追加
              </button>
            </form>

            {error ? <p className="error">{error}</p> : null}

            {tasks.length === 0 ? (
              <p className="empty">課題はまだありません</p>
            ) : (
              <ul className="list">
                {tasks.map((task) => (
                  <li key={task.id} className="list-item">
                    <div>
                      <Link
                        className="title"
                        href={`/workspaces/${workspaceId}/tasks/${task.id}`}
                      >
                        #{task.id} {task.title}
                      </Link>
                      <div className="meta">
                        <span className="badge">{labelOf(ISSUE_TYPES, task.issue_type)}</span>
                        <span className="badge ok">{labelOf(STATUSES, task.status)}</span>
                        <span className="badge warn">
                          優先度 {labelOf(PRIORITIES, task.priority)}
                        </span>
                        {task.assignee_name ? (
                          <span className="badge">担当: {task.assignee_name}</span>
                        ) : null}
                        {task.parent_id ? (
                          <span className="badge">親 #{task.parent_id}</span>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      className="btn btn-ghost"
                      href={`/workspaces/${workspaceId}/tasks/${task.id}`}
                    >
                      詳細
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
