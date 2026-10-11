"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="shell">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
