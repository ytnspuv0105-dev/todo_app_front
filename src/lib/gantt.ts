import { Task } from "@/lib/api";

export type GanttBar = {
  task: Task;
  start: Date;
  end: Date;
  startIndex: number;
  daySpan: number;
};

export type GanttGroup = {
  key: string;
  label: string;
  bars: GanttBar[];
};

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, month - 1, day);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== y ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTickLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

export function dayDiff(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

/** Inclusive bar from 開始日/期限日; omit when neither is set. */
export function taskBarRange(task: Task): { start: Date; end: Date } | null {
  const start = task.start_date ? parseDateOnly(task.start_date) : null;
  const end = task.due_date ? parseDateOnly(task.due_date) : null;
  if (!start && !end) return null;
  if (start && end) {
    return start.getTime() <= end.getTime()
      ? { start, end }
      : { start: end, end: start };
  }
  const only = (start ?? end)!;
  return { start: only, end: only };
}

export function buildGanttModel(tasks: Task[]): {
  rangeStart: Date;
  rangeEnd: Date;
  dayCount: number;
  days: Date[];
  groups: GanttGroup[];
} | null {
  const dated: { task: Task; start: Date; end: Date }[] = [];
  for (const task of tasks) {
    const range = taskBarRange(task);
    if (!range) continue;
    dated.push({ task, ...range });
  }
  if (!dated.length) return null;

  let rangeStart = dated[0].start;
  let rangeEnd = dated[0].end;
  for (const item of dated) {
    if (item.start.getTime() < rangeStart.getTime()) rangeStart = item.start;
    if (item.end.getTime() > rangeEnd.getTime()) rangeEnd = item.end;
  }

  const dayCount = dayDiff(rangeStart, rangeEnd) + 1;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(rangeStart, i));

  const groupsMap = new Map<string, GanttGroup>();
  for (const item of dated) {
    const key =
      item.task.assignee_id == null ? "unassigned" : `u:${item.task.assignee_id}`;
    const label =
      item.task.assignee_id == null
        ? "未設定"
        : item.task.assignee_name?.trim() || `ユーザー ${item.task.assignee_id}`;
    let group = groupsMap.get(key);
    if (!group) {
      group = { key, label, bars: [] };
      groupsMap.set(key, group);
    }
    group.bars.push({
      task: item.task,
      start: item.start,
      end: item.end,
      startIndex: dayDiff(rangeStart, item.start),
      daySpan: dayDiff(item.start, item.end) + 1,
    });
  }

  for (const group of groupsMap.values()) {
    group.bars.sort((a, b) => {
      const byStart = a.startIndex - b.startIndex;
      if (byStart !== 0) return byStart;
      return a.task.number - b.task.number;
    });
  }

  const groups = [...groupsMap.values()].sort((a, b) => {
    if (a.key === "unassigned") return 1;
    if (b.key === "unassigned") return -1;
    return a.label.localeCompare(b.label, "ja");
  });

  return { rangeStart, rangeEnd, dayCount, days, groups };
}
