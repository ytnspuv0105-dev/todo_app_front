export const ISSUE_TYPES = [
  { value: "task", label: "タスク" },
  { value: "bug", label: "バグ" },
  { value: "request", label: "要望" },
  { value: "other", label: "その他" },
] as const;

export const STATUSES = [
  { value: "open", label: "未対応" },
  { value: "in_progress", label: "処理中" },
  { value: "resolved", label: "処理済み" },
  { value: "closed", label: "完了" },
] as const;

export const PRIORITIES = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

export const WORKSPACE_ROLES = [
  { value: "admin", label: "管理者" },
  { value: "worker", label: "作業者" },
] as const;

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function workspaceRoleLabel(role: string): string {
  return labelOf(WORKSPACE_ROLES, role);
}

/** Invite expiry display; null/empty means no expiry policy. */
export function inviteExpiryLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "無期限";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "無期限";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
