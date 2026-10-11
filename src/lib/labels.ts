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

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
