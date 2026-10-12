import { Task } from "@/lib/api";
import { addDays, localToday, parseDateOnly } from "@/lib/gantt";

/** Status values treated as done for 期限が近い. */
export const DONE_STATUSES = new Set(["closed"]);

/**
 * 期限日 is today, within the next 7 days (inclusive), or already past.
 * Tasks without 期限日 or in a done/closed status are excluded.
 */
export function isDueSoon(task: Task, now = new Date()): boolean {
  if (!task.due_date) return false;
  if (DONE_STATUSES.has(task.status)) return false;
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
