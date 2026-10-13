import { Task } from "@/lib/api";
import { addDays, localToday, parseDateOnly } from "@/lib/gantt";

/** 完了. Hidden from 自分の担当, 期限が近い, and the gantt. 処理済み stays. */
export function isClosedStatus(status: string): boolean {
  return status === "closed";
}

/**
 * 期限日 is today, within the next 7 days (inclusive), or already past.
 * Tasks without 期限日 or with status 完了 are excluded.
 */
export function isDueSoon(task: Task, now = new Date()): boolean {
  if (!task.due_date) return false;
  if (isClosedStatus(task.status)) return false;
  const due = parseDateOnly(task.due_date);
  if (!due) return false;
  const today = localToday(now);
  const horizon = addDays(today, 7);
  return due.getTime() <= horizon.getTime();
}

/** Soonest 期限日 first (overdue before upcoming). */
export function sortByDueDateAsc(a: Task, b: Task): number {
  const da = a.due_date ?? "";
  const db = b.due_date ?? "";
  if (da !== db) return da.localeCompare(db);
  return a.number - b.number;
}
