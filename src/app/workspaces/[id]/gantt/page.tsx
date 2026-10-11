"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AssigneeGantt from "@/components/AssigneeGantt";
import { Task, listTasks } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function WorkspaceGanttPage() {
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
      <h2 className="hero-title" style={{ fontSize: "1.7rem" }}>
        ガントチャート
      </h2>
      <p className="lede">担当者ごとの開始日・期限日を表示します。</p>

      {error ? <p className="error">{error}</p> : null}
      {loading ? (
        <p className="muted">読み込み中…</p>
      ) : (
        <section className="panel gantt-panel">
          <AssigneeGantt workspaceId={workspaceId} tasks={tasks} />
        </section>
      )}
    </>
  );
}
