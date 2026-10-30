import { Task } from "@/lib/api";

/** Parent and its ancestors, by workspace number. Includes the parent. */
export function ancestorNumbers(
  tasks: Task[],
  parentNumber: number | null,
): Set<number> {
  if (parentNumber == null || Number.isNaN(parentNumber)) return new Set();
  const byNumber = new Map(tasks.map((task) => [task.number, task]));
  const out = new Set<number>();
  const seen = new Set<number>();
  let current = byNumber.get(parentNumber);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    out.add(current.number);
    if (current.parent_number == null) break;
    current = byNumber.get(current.parent_number);
  }
  return out;
}

/** Workspace numbers of tasks under rootId, not including the root. */
export function descendantNumbers(tasks: Task[], rootId: number): Set<number> {
  const childrenByParent = new Map<number, Task[]>();
  for (const task of tasks) {
    if (task.parent_id == null) continue;
    const list = childrenByParent.get(task.parent_id) ?? [];
    list.push(task);
    childrenByParent.set(task.parent_id, list);
  }
  const out = new Set<number>();
  const seen = new Set<number>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const task = stack.pop()!;
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    out.add(task.number);
    stack.push(...(childrenByParent.get(task.id) ?? []));
  }
  return out;
}
