"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <h1 className="brand">
        <Link href="/workspaces">ワークスペース課題</Link>
      </h1>
      {user ? (
        <div className="userchip">
          <span>
            {user.display_name}
            {user.role === "admin" ? "（管理者）" : ""}
          </span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            ログアウト
          </button>
        </div>
      ) : null}
    </header>
  );
}
