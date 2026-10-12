"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkspacesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <div className="shell">
      <p className="muted">読み込み中…</p>
    </div>
  );
}
