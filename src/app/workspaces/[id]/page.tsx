"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TaskHistoryItem from "@/components/TaskHistoryItem";
import TaskListItem from "@/components/TaskListItem";
import {
  Invite,
  Task,
  TaskChangeHistory,
  Workspace,
  createInvite,
  getWorkspace,
  listTaskHistory,
  listTasks,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDueSoon, sortByDueDateAsc } from "@/lib/dueSoon";
import { inviteExpiryLabel, workspaceRoleLabel } from "@/lib/labels";
import { formatTaskNumber } from "@/lib/taskDisplay";

const HISTORY_LIMIT = 20;

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token, user } = useAuth();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<TaskChangeHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [w, t, h] = await Promise.all([
          getWorkspace(token, workspaceId),
          listTasks(token, workspaceId),
          listTaskHistory(token, workspaceId, HISTORY_LIMIT),
        ]);
        if (!cancelled) {
          setWs(w);
          setTasks(t);
          setHistory(h);
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

  const mine = useMemo(
    () => tasks.filter((t) => user && t.assignee_id === user.id),
    [tasks, user],
  );

  const dueSoon = useMemo(
    () => tasks.filter((t) => isDueSoon(t)).sort(sortByDueDateAsc),
    [tasks],
  );

  const mineListHref = user
    ? `/workspaces/${workspaceId}/tasks?assignee=${user.id}`
    : `/workspaces/${workspaceId}/tasks`;

  async function onInvite() {
    if (!token) return;
    setError(null);
    try {
      const inv = await createInvite(token, workspaceId, "worker");
      const url = `${window.location.origin}${inv.invite_path}`;
      setInvite(inv);
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
            最近の変更履歴と、自分の担当課題を確認します。
          </p>
        </div>
        {ws?.my_role === "admin" ? (
          <button type="button" className="btn btn-ghost" onClick={onInvite}>
            招待リンクを発行
          </button>
        ) : null}
      </div>

      {invite && inviteUrl ? (
        <section className="panel stack invite-created" style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>招待リンクを発行しました</h3>
          <dl className="invite-meta">
            <div>
              <dt>参加後のロール</dt>
              <dd>{workspaceRoleLabel(invite.role)}</dd>
            </div>
            <div>
              <dt>リンクの有効期限</dt>
              <dd>{inviteExpiryLabel(invite.expires_at)}</dd>
            </div>
          </dl>
          <p className="muted" style={{ margin: 0 }}>
            クリップボードにコピー済み: <code className="invite-url">{inviteUrl}</code>
          </p>
        </section>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack" style={{ marginBottom: "1rem" }}>
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>最近のタスク</h3>
          <span className="muted">{history.length} 件</span>
        </div>
        {history.length === 0 ? (
          <p className="empty">まだ変更履歴はありません</p>
        ) : (
          <ul className="history-list">
            {history.map((entry) => (
              <TaskHistoryItem
                key={entry.id}
                entry={entry}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack" style={{ marginBottom: "1rem" }}>
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>期限が近い</h3>
          <span className="muted">{dueSoon.length} 件</span>
        </div>
        {dueSoon.length === 0 ? (
          <p className="empty">期限が近い課題はありません</p>
        ) : (
          <ul className="due-soon-list">
            {dueSoon.map((task) => {
              const href = `/workspaces/${workspaceId}/tasks/${task.id}`;
              return (
                <li key={task.id} className="due-soon-item">
                  <Link
                    className="task-number"
                    href={href}
                    aria-label={`課題 ${formatTaskNumber(task.number)} の詳細`}
                  >
                    {formatTaskNumber(task.number)}
                  </Link>
                  <Link className="due-soon-title" href={href}>
                    {task.title}
                  </Link>
                  <span className="due-soon-date muted">{task.due_date}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <div className="section-head section-head-mine">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>自分の担当</h3>
          <div className="section-head-actions">
            <Link className="btn btn-ghost" href={mineListHref}>
              課題一覧で見る
            </Link>
            <span className="muted">{mine.length} 件</span>
          </div>
        </div>
        {mine.length === 0 ? (
          <p className="empty">担当している課題はありません</p>
        ) : (
          <ul className="task-card-list">
            {mine.map((task) => (
              <TaskListItem key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
