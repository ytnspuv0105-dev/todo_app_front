"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TaskListItem from "@/components/TaskListItem";
import { Task, listTasks } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function TaskListPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          <span className="muted">{tasks.length} 件</span>
        </div>

        {error ? <p className="error">{error}</p> : null}

        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">課題はまだありません</p>
        ) : (
          <ul className="list">
            {tasks.map((task) => (
              <TaskListItem key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
