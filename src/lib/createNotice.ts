const STORAGE_KEY = "todo-create-notice";

let mountedKey: string | null = null;

export function createNoticeKey(workspaceId: number, taskId: number) {
  return `${workspaceId}:${taskId}`;
}

export function armCreateNotice(workspaceId: number, taskId: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, createNoticeKey(workspaceId, taskId));
  } catch {
    /* private mode */
  }
}

export function peekCreateNotice(workspaceId: number, taskId: number) {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === createNoticeKey(workspaceId, taskId);
  } catch {
    return false;
  }
}

export function clearCreateNoticeFor(workspaceId: number, taskId: number) {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === createNoticeKey(workspaceId, taskId)) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Drop `?created=1` without a Next.js navigation so the detail page stays mounted. */
export function stripCreatedQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("created") !== "1") return;
  url.searchParams.delete("created");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function markCreateNoticeMounted(key: string) {
  mountedKey = key;
}

export function markCreateNoticeUnmounted(key: string) {
  if (mountedKey === key) mountedKey = null;
}

export function isCreateNoticeMounted(key: string) {
  return mountedKey === key;
}
