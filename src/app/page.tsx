"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { resolveHomePath } from "@/lib/landing";

export default function HomePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const dest = await resolveHomePath(token);
        if (!cancelled) router.replace(dest);
      } catch {
        if (!cancelled) router.replace("/account");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, token, loading, router]);

  return (
    <div className="shell">
      <p className="muted">読み込み中…</p>
    </div>
  );
}
