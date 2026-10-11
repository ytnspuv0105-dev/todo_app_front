"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TaskListItem from "@/components/TaskListItem";
import {
  Task,
  Workspace,
  createInvite,
  getWorkspace,
  listTasks,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const RECENT_LIMIT = 8;

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token, user } = useAuth();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [w, t] = await Promise.all([
          getWorkspace(token, workspaceId),
          listTasks(token, workspaceId),
        ]);
        if (!cancelled) {
          setWs(w);
          setTasks(t);
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

  const recent = useMemo(() => tasks.slice(0, RECENT_LIMIT), [tasks]);
  const mine = useMemo(
    () => tasks.filter((t) => user && t.assignee_id === user.id),
    [tasks, user],
  );

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

  if (loading) {
    return <p className="muted">読み込み中…</p>;
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h2 className="hero-title" style={{ fontSize: "1.8rem" }}>
            {ws?.name ?? "ダッシュボード"}
          </h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            最近更新された課題と、自分の担当課題を確認します。
          </p>
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

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack" style={{ marginBottom: "1rem" }}>
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>最近のタスク</h3>
          <span className="muted">{recent.length} 件</span>
        </div>
        {recent.length === 0 ? (
          <p className="empty">課題はまだありません</p>
        ) : (
          <ul className="list">
            {recent.map((task) => (
              <TaskListItem key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>自分の担当</h3>
          <span className="muted">{mine.length} 件</span>
        </div>
        {mine.length === 0 ? (
          <p className="empty">担当している課題はありません</p>
        ) : (
          <ul className="list">
            {mine.map((task) => (
              <TaskListItem key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
