"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import {
  Invite,
  Workspace,
  createInvite,
  getWorkspace,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rememberWorkspace } from "@/lib/landing";
import { inviteExpiryLabel, workspaceRoleLabel } from "@/lib/labels";

type Props = {
  workspaceId: number;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

function WorkspaceMenu({
  ws,
  pathname,
  navItems,
  canInvite,
  inviteBusy,
  inviteError,
  invite,
  inviteUrl,
  onInvite,
}: {
  ws: Workspace | null;
  pathname: string;
  navItems: NavItem[];
  canInvite: boolean;
  inviteBusy: boolean;
  inviteError: string | null;
  invite: Invite | null;
  inviteUrl: string | null;
  onInvite: () => void;
}) {
  return (
    <nav className="ws-nav" aria-label="ワークスペースメニュー">
      <p className="ws-nav-name">{ws?.name ?? "ワークスペース"}</p>
      <ul className="ws-nav-list">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`ws-nav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {canInvite ? (
        <div className="ws-nav-invite">
          <button
            type="button"
            className="ws-nav-link"
            onClick={onInvite}
            disabled={inviteBusy}
          >
            招待リンクを発行
          </button>
          {inviteError ? <p className="error">{inviteError}</p> : null}
          {invite && inviteUrl ? (
            <div className="ws-nav-invite-result">
              <p className="ws-nav-invite-title">招待リンクを発行しました</p>
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
              <p className="muted ws-nav-invite-url">
                コピー済み: <code className="invite-url">{inviteUrl}</code>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="ws-nav-foot">
        <Link href="/account" className="ws-nav-link muted-link">
          アカウント
        </Link>
      </div>
    </nav>
  );
}

export default function WorkspaceShell({ workspaceId, children }: Props) {
  const { token, user, logout } = useAuth();
  const pathname = usePathname();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getWorkspace(token, workspaceId);
        if (!cancelled) {
          setWs(data);
          rememberWorkspace(workspaceId);
        }
      } catch {
        if (!cancelled) setWs(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, workspaceId]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const base = `/workspaces/${workspaceId}`;
  const navItems: NavItem[] = [
    {
      href: base,
      label: "ダッシュボード",
      match: (p) => p === base || p === `${base}/`,
    },
    {
      href: `${base}/tasks`,
      label: "課題一覧",
      match: (p) => p === `${base}/tasks` || p === `${base}/tasks/`,
    },
    {
      href: `${base}/tasks/new`,
      label: "課題を追加",
      match: (p) => p.startsWith(`${base}/tasks/new`),
    },
    {
      href: `${base}/gantt`,
      label: "ガントチャート",
      match: (p) => p === `${base}/gantt` || p === `${base}/gantt/`,
    },
  ];

  async function onInvite() {
    if (!token || inviteBusy) return;
    setInviteError(null);
    setInviteBusy(true);
    try {
      const inv = await createInvite(token, workspaceId, "worker");
      const url = `${window.location.origin}${inv.invite_path}`;
      setInvite(inv);
      setInviteUrl(url);
      await navigator.clipboard.writeText(url).catch(() => undefined);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "招待の作成に失敗しました");
    } finally {
      setInviteBusy(false);
    }
  }

  const renderMenu = () => (
    <WorkspaceMenu
      ws={ws}
      pathname={pathname}
      navItems={navItems}
      canInvite={ws?.my_role === "admin"}
      inviteBusy={inviteBusy}
      inviteError={inviteError}
      invite={invite}
      inviteUrl={inviteUrl}
      onInvite={onInvite}
    />
  );

  return (
    <div className="ws-app">
      <div className="ws-top">
        <AppHeader />
        <button
          type="button"
          className="ws-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="ws-drawer"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "閉じる" : "メニュー"}
        </button>
      </div>

      <div className="ws-body">
        <aside className="ws-sidebar" aria-label="サイドメニュー">
          {renderMenu()}
        </aside>

        <div
          id="ws-drawer"
          className={`ws-drawer${menuOpen ? " is-open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <button
            type="button"
            className="ws-drawer-backdrop"
            aria-label="メニューを閉じる"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          />
          <div className="ws-drawer-panel">
            {user ? (
              <div className="ws-drawer-user">
                <span className="ws-drawer-user-name">
                  {user.display_name}
                  {user.role === "admin" ? "（管理者）" : ""}
                </span>
                <button type="button" className="btn btn-ghost" onClick={logout}>
                  ログアウト
                </button>
              </div>
            ) : null}
            {renderMenu()}
          </div>
        </div>

        <main className="ws-main">{children}</main>
      </div>
    </div>
  );
}
