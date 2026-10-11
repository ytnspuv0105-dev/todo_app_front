"use client";

import { useParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import WorkspaceShell from "@/components/WorkspaceShell";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const workspaceId = Number(params.id);

  return (
    <RequireAuth>
      {workspaceId ? (
        <WorkspaceShell workspaceId={workspaceId}>{children}</WorkspaceShell>
      ) : (
        <p className="muted">ワークスペースが見つかりません</p>
      )}
    </RequireAuth>
  );
}
