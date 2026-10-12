"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InviteInfo, getInviteInfo, joinInvite } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inviteExpiryLabel, workspaceRoleLabel } from "@/lib/labels";

export default function InvitePage() {
  const params = useParams();
  const inviteToken = String(params.token);
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getInviteInfo(inviteToken);
        if (!cancelled) setInfo(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "招待リンクが無効です");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function onJoin() {
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ws = await joinInvite(token, inviteToken);
      router.push(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-auth">
      <h1 className="hero-title">招待</h1>
      <p className="lede">ワークスペースへの招待リンクです。</p>
      <section className="panel stack">
        {error ? <p className="error">{error}</p> : null}
        {info ? (
          <>
            <p>
              <strong>{info.workspace_name}</strong> への招待です。
            </p>
            <dl className="invite-meta">
              <div>
                <dt>参加後のロール</dt>
                <dd>{workspaceRoleLabel(info.role)}</dd>
              </div>
              <div>
                <dt>リンクの有効期限</dt>
                <dd>{inviteExpiryLabel(info.expires_at)}</dd>
              </div>
            </dl>
            {loading ? (
              <p className="muted">読み込み中…</p>
            ) : user ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={onJoin}
                disabled={busy}
              >
                参加する
              </button>
            ) : (
              <div className="stack">
                <Link
                  className="btn btn-primary"
                  href={`/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}`}
                  style={{ textAlign: "center" }}
                >
                  ログインして参加
                </Link>
                <Link
                  className="btn btn-ghost"
                  href={`/signup?next=${encodeURIComponent(`/invite/${inviteToken}`)}`}
                  style={{ textAlign: "center" }}
                >
                  新規登録して参加
                </Link>
              </div>
            )}
          </>
        ) : !error ? (
          <p className="muted">招待情報を確認しています…</p>
        ) : null}
      </section>
    </main>
  );
}
