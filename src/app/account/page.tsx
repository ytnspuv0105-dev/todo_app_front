"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import RequireAuth from "@/components/RequireAuth";
import {
  Workspace,
  createWorkspace,
  listWorkspaces,
  updateProfile,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountInner />
    </RequireAuth>
  );
}

function AccountInner() {
  const { token, user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [items, setItems] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name);
    setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listWorkspaces(token);
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileError(null);
    setProfileMessage(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setProfileError("表示名を入力してください");
      return;
    }
    if (!trimmedEmail) {
      setProfileError("メールアドレスを入力してください");
      return;
    }

    const changingPassword = newPassword.length > 0;
    if (changingPassword && !currentPassword) {
      setProfileError("パスワードを変更するには現在のパスワードを入力してください");
      return;
    }
    if (changingPassword && newPassword.length < 8) {
      setProfileError("新しいパスワードは8文字以上にしてください");
      return;
    }

    setProfileBusy(true);
    try {
      const updated = await updateProfile(token, {
        display_name: trimmedName,
        email: trimmedEmail,
        ...(changingPassword
          ? { current_password: currentPassword, new_password: newPassword }
          : {}),
      });
      updateUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setProfileMessage("保存しました");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setProfileBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setCreateBusy(true);
    setListError(null);
    try {
      const ws = await createWorkspace(token, name.trim());
      setItems((prev) => [ws, ...prev]);
      setName("");
    } catch (err) {
      setListError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="shell">
      <AppHeader />
      <h2 className="hero-title">アカウント</h2>
      <p className="lede">表示名、メールアドレス、パスワードを変更できます。</p>

      <section className="panel stack" style={{ marginBottom: "1rem" }}>
        <form className="stack" onSubmit={onSaveProfile}>
          <label className="field">
            表示名
            <input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setProfileMessage(null);
              }}
              required
              maxLength={120}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setProfileMessage(null);
              }}
              required
              autoComplete="email"
            />
          </label>
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              パスワードは変更するときだけ入力してください。変更には現在のパスワードが必要です。
            </p>
            <label className="field">
              現在のパスワード
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setProfileMessage(null);
                }}
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              新しいパスワード
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setProfileMessage(null);
                }}
                autoComplete="new-password"
              />
            </label>
          </div>
          {profileError ? <p className="error">{profileError}</p> : null}
          {profileMessage ? <p className="muted">{profileMessage}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={profileBusy}>
            保存
          </button>
        </form>
      </section>

      <h2 className="hero-title" style={{ fontSize: "1.6rem" }}>
        ワークスペース
      </h2>
      <p className="lede">所属しているワークスペースを選ぶとダッシュボードが開きます。</p>

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
            <button className="btn btn-primary" type="submit" disabled={createBusy || !name.trim()}>
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
        {listError ? <p className="error">{listError}</p> : null}
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
