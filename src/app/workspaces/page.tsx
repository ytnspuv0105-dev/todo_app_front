"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import RequireAuth from "@/components/RequireAuth";
import { Workspace, createWorkspace, listWorkspaces } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function WorkspacesPage() {
  return (
    <RequireAuth>
      <WorkspacesInner />
    </RequireAuth>
  );
}

function WorkspacesInner() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listWorkspaces(token);
        if (!cancelled) setItems(data);
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
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ws = await createWorkspace(token, name.trim());
      setItems((prev) => [ws, ...prev]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <AppHeader />
      <h2 className="hero-title">ワークスペース</h2>
      <p className="lede">所属しているワークスペースを選んで課題を管理します。</p>

      {user?.role === "admin" ? (
        <section className="panel stack" style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>新規ワークスペース（管理者）</h3>
          <form className="row" onSubmit={onCreate}>
            <input
              style={{ flex: 1, minWidth: 0 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 開発チーム"
              maxLength={200}
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
              作成
            </button>
          </form>
        </section>
      ) : (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          ワークスペースの作成は管理者のみ可能です。招待リンクから参加してください。
        </p>
      )}

      <section className="panel">
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="empty">ワークスペースはまだありません</p>
        ) : (
          <ul className="list">
            {items.map((ws) => (
              <li key={ws.id} className="list-item">
                <div>
                  <Link className="title" href={`/workspaces/${ws.id}`}>
                    {ws.name}
                  </Link>
                  <div className="meta">
                    <span className="badge">
                      {ws.my_role === "admin" ? "WS管理者" : "メンバー"}
                    </span>
                  </div>
                </div>
                <Link className="btn btn-ghost" href={`/workspaces/${ws.id}`}>
                  開く
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
