"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Workspace, getWorkspace } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = {
  workspaceId: number;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

export default function WorkspaceShell({ workspaceId, children }: Props) {
  const { token } = useAuth();
  const pathname = usePathname();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getWorkspace(token, workspaceId);
        if (!cancelled) setWs(data);
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

  const nav = (
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
      <div className="ws-nav-foot">
        <Link href="/workspaces" className="ws-nav-link muted-link">
          ワークスペース一覧
        </Link>
      </div>
    </nav>
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
          {nav}
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
          <div className="ws-drawer-panel">{nav}</div>
        </div>

        <main className="ws-main">{children}</main>
      </div>
    </div>
  );
}
