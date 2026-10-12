"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth";
import { resolveHomePath, safeNextPath } from "@/lib/landing";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="center-auth"><p className="muted">読み込み中…</p></main>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { login, user, token, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const dest = next ?? (await resolveHomePath(token));
        if (!cancelled) router.replace(dest);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "移動に失敗しました");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, token, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <div className="gate-bar">
      <AppHeader />
    </div>
    <main className="center-auth">
      <h1 className="hero-title">ログイン</h1>
      <p className="lede">メールアドレスでログインしてください。</p>
      <section className="panel stack">
        <form className="stack" onSubmit={onSubmit}>
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
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            ログイン
          </button>
        </form>
        <p className="muted">
          アカウントをお持ちでない方は <Link href="/signup">新規登録</Link>
        </p>
      </section>
    </main>
    </>
  );
}
