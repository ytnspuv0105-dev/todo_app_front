"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="center-auth"><p className="muted">読み込み中…</p></main>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const { signup, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/workspaces";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(email, password, displayName);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-auth">
      <h1 className="hero-title">新規登録</h1>
      <p className="lede">最初に登録したユーザーが管理者になります。</p>
      <section className="panel stack">
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            表示名
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label className="field">
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            パスワード（8文字以上）
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            登録する
          </button>
        </form>
        <p className="muted">
          既にアカウントがある方は <Link href="/login">ログイン</Link>
        </p>
      </section>
    </main>
  );
}
