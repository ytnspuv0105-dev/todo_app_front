import { Task } from "@/lib/api";
import { ISSUE_TYPES, PRIORITIES, STATUSES, labelOf } from "@/lib/labels";

const DESC_LIMIT = 40;

export function formatTaskNumber(n: number): string {
  return `#${n}`;
}

export function truncateText(text: string, limit = DESC_LIMIT): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "—";
  if (t.length <= limit) return t;
  return `${t.slice(0, limit)}…`;
}

export function dash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

export function parentChildLabel(task: Task): string {
  const parts: string[] = [];
  if (task.parent_number != null) parts.push(`親 ${formatTaskNumber(task.parent_number)}`);
  if (task.child_numbers?.length) {
    parts.push(`子 ${task.child_numbers.map(formatTaskNumber).join(", ")}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function countLabel(n: number): string {
  return n > 0 ? String(n) : "—";
}

export function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export type TaskFieldRow = {
  key: string;
  label: string;
  value: string;
  title?: string;
};

/** Current stored field values for list/dashboard display (not a history feed). */
export function taskFieldRows(task: Task): TaskFieldRow[] {
  return [
    { key: "number", label: "番号", value: formatTaskNumber(task.number) },
    { key: "issue_type", label: "種別", value: labelOf(ISSUE_TYPES, task.issue_type) },
    { key: "title", label: "件名", value: task.title },
    {
      key: "description",
      label: "詳細",
      value: truncateText(task.description),
      title: task.description?.trim() || undefined,
    },
    { key: "status", label: "状態", value: labelOf(STATUSES, task.status) },
    { key: "priority", label: "優先度", value: labelOf(PRIORITIES, task.priority) },
    { key: "assignee", label: "担当者", value: dash(task.assignee_name) },
    { key: "start_date", label: "開始日", value: dash(task.start_date) },
    { key: "due_date", label: "期限日", value: dash(task.due_date) },
    { key: "category", label: "カテゴリー", value: dash(task.category) },
    { key: "milestone", label: "マイルストーン", value: dash(task.milestone) },
    { key: "parent_child", label: "親子", value: parentChildLabel(task) },
    {
      key: "related",
      label: "関連",
      value:
        task.related_task_numbers?.length
          ? task.related_task_numbers.map(formatTaskNumber).join(", ")
          : "—",
    },
    {
      key: "attachments",
      label: "添付",
      value: countLabel(task.attachments?.length ?? 0),
    },
  ];
}
