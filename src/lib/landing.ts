import { listWorkspaces } from "./api";

const LAST_WORKSPACE_KEY = "todo_app_last_workspace";

export function rememberWorkspace(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  localStorage.setItem(LAST_WORKSPACE_KEY, String(id));
}

export function readLastWorkspaceId(): number | null {
  const raw = localStorage.getItem(LAST_WORKSPACE_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Dashboard of the last opened workspace, else the first membership, else the account screen. */
export async function resolveHomePath(token: string): Promise<string> {
  const workspaces = await listWorkspaces(token);
  if (workspaces.length === 0) return "/account";
  const last = readLastWorkspaceId();
  if (last != null && workspaces.some((ws) => ws.id === last)) {
    return `/workspaces/${last}`;
  }
  return `/workspaces/${workspaces[0].id}`;
}

/** Honor a return path only for a workspace or invite. Login itself does not open the account screen. */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  if (next.startsWith("/workspaces/") || next.startsWith("/invite/")) return next;
  return null;
}
