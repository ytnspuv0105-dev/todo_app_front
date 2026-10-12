"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Task, updateTask } from "@/lib/api";
import {
  addDays,
  buildGanttModel,
  dayDiff,
  formatDateOnly,
  formatTickLabel,
  localToday,
} from "@/lib/gantt";
import { formatTaskNumber } from "@/lib/taskDisplay";

type Props = {
  workspaceId: number;
  token: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
};

const DAY_PX = 40;
const SAVE_ERROR = "日付の保存に失敗しました";

type DragSession = {
  taskId: number;
  edge: "start" | "end";
  track: HTMLElement;
  rangeStart: Date;
  dayCount: number;
  /** Working dates during the drag (always both set). */
  start: string;
  due: string;
  /** Committed dates before the drag (for rollback on save failure). */
  originalStart: string | null;
  originalDue: string | null;
};

type DateDraft = {
  start_date: string;
  due_date: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function dayIndexFromClientX(
  clientX: number,
  track: HTMLElement,
  dayCount: number,
) {
  const rect = track.getBoundingClientRect();
  return clamp(Math.floor((clientX - rect.left) / DAY_PX), 0, dayCount - 1);
}

function TodayLine({ index }: { index: number }) {
  if (index < 0) return null;
  return (
    <div
      className="gantt-today-line"
      style={{ left: index * DAY_PX + DAY_PX / 2 }}
      aria-hidden
    />
  );
}

export default function AssigneeGantt({
  workspaceId,
  token,
  tasks,
  onTaskUpdated,
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, DateDraft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const movedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const today = useMemo(() => localToday(), []);
  const todayKey = formatDateOnly(today);

  const displayTasks = useMemo(
    () =>
      tasks.map((t) => {
        const draft = drafts[t.id];
        if (!draft) return t;
        return { ...t, start_date: draft.start_date, due_date: draft.due_date };
      }),
    [tasks, drafts],
  );

  // Keep axis padded from committed tasks so drag previews do not shrink the range.
  const committedModel = useMemo(() => buildGanttModel(tasks), [tasks]);
  const model = useMemo(() => {
    if (!committedModel) return buildGanttModel(displayTasks);
    return buildGanttModel(displayTasks, {
      rangeStart: committedModel.rangeStart,
      rangeEnd: committedModel.rangeEnd,
    });
  }, [committedModel, displayTasks]);

  // First paint: put today near the left edge of the timeline viewport.
  useEffect(() => {
    if (!model || !scrollRef.current || didInitialScrollRef.current) return;
    const idx = dayDiff(model.rangeStart, today);
    if (idx < 0 || idx >= model.dayCount) return;
    scrollRef.current.scrollLeft = idx * DAY_PX;
    didInitialScrollRef.current = true;
  }, [model, today]);

  function clearDraft(taskId: number) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  function restoreOriginalDates(session: DragSession) {
    // Drop the drag draft so the bar snaps back to committed start/due
    // (session.originalStart / originalDue are the pre-drag values).
    clearDraft(session.taskId);
  }

  function previewDrag(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const dayStr = formatDateOnly(
      addDays(
        drag.rangeStart,
        dayIndexFromClientX(clientX, drag.track, drag.dayCount),
      ),
    );
    let start = drag.start;
    let due = drag.due;
    if (drag.edge === "start") {
      start = dayStr > due ? due : dayStr;
    } else {
      due = dayStr < start ? start : dayStr;
    }
    drag.start = start;
    drag.due = due;
    setDrafts((prev) => ({
      ...prev,
      [drag.taskId]: { start_date: start, due_date: due },
    }));
  }

  function beginDrag(
    edge: "start" | "end",
    task: Task,
    track: HTMLElement,
    rangeStart: Date,
    dayCount: number,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
    e.stopPropagation();
    movedRef.current = false;
    suppressClickRef.current = false;

    const start = task.start_date ?? task.due_date!;
    const due = task.due_date ?? task.start_date!;
    const handle = e.currentTarget;

    dragRef.current = {
      taskId: task.id,
      edge,
      track,
      rangeStart,
      dayCount,
      start,
      due,
      originalStart: task.start_date,
      originalDue: task.due_date,
    };

    setDrafts((prev) => ({
      ...prev,
      [task.id]: { start_date: start, due_date: due },
    }));

    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* capture may be unavailable; window listeners still work */
    }

    const onMove = (ev: PointerEvent) => {
      if (dragRef.current?.taskId !== task.id) return;
      movedRef.current = true;
      suppressClickRef.current = true;
      ev.preventDefault();
      previewDrag(ev.clientX);
    };

    const finish = async (ev: PointerEvent) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      try {
        if (handle.hasPointerCapture(ev.pointerId)) {
          handle.releasePointerCapture(ev.pointerId);
        }
      } catch {
        /* ignore */
      }

      previewDrag(ev.clientX);
      const session = dragRef.current;
      dragRef.current = null;
      if (!session) return;

      const original = tasks.find((t) => t.id === session.taskId);
      if (!original) {
        restoreOriginalDates(session);
        return;
      }

      const { start: finalStart, due: finalDue, edge: dragEdge } = session;

      // No movement / no change → skip save and allow click.
      if (
        !movedRef.current ||
        (original.start_date === finalStart && original.due_date === finalDue)
      ) {
        restoreOriginalDates(session);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        return;
      }

      const payload: Record<string, unknown> = {};
      if (original.start_date && original.due_date) {
        if (dragEdge === "start") {
          payload.start_date = finalStart;
          payload.clear_start_date = false;
        } else {
          payload.due_date = finalDue;
          payload.clear_due_date = false;
        }
      } else {
        // Single-date bar: dragging an edge can introduce the missing date.
        payload.start_date = finalStart;
        payload.due_date = finalDue;
        payload.clear_start_date = false;
        payload.clear_due_date = false;
      }

      setSavingId(session.taskId);
      setError(null);
      try {
        const updated = await updateTask(
          token,
          workspaceId,
          session.taskId,
          payload,
        );
        onTaskUpdated(updated);
        clearDraft(session.taskId);
      } catch {
        setError(SAVE_ERROR);
        restoreOriginalDates(session);
      } finally {
        setSavingId(null);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    };

    // Capture on the handle for touch; also listen on window as a fallback.
    handle.addEventListener("pointermove", onMove, { passive: false });
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    previewDrag(e.clientX);
  }

  if (!model) {
    return (
      <p className="empty gantt-empty" role="status">
        開始日または期限日が設定された課題はありません。
      </p>
    );
  }

  const { dayCount, days, groups, rangeStart, rangeEnd } = model;
  const timelineWidth = dayCount * DAY_PX;
  const todayIndex = dayDiff(rangeStart, today);

  return (
    <div className="gantt">
      <p className="gantt-range muted">
        表示期間: {formatDateOnly(rangeStart)} ～ {formatDateOnly(rangeEnd)}
      </p>
      <p className="gantt-hint muted">
        バーの端をドラッグすると開始日・期限日を変更できます。
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div
        className="gantt-scroll"
        role="region"
        aria-label="ガントチャート"
        ref={scrollRef}
      >
        <div
          className="gantt-grid"
          style={
            {
              "--gantt-day-w": `${DAY_PX}px`,
              "--gantt-days": dayCount,
              "--gantt-timeline-w": `${timelineWidth}px`,
            } as CSSProperties
          }
        >
          <div className="gantt-corner">課題</div>
          <div className="gantt-head" style={{ width: timelineWidth }}>
            {days.map((d) => {
              const key = formatDateOnly(d);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`gantt-tick${d.getDate() === 1 ? " is-month" : ""}${isToday ? " is-today" : ""}`}
                  style={{ width: DAY_PX }}
                  title={isToday ? `${key}（今日）` : key}
                  data-gantt-today={isToday ? "true" : undefined}
                >
                  {formatTickLabel(d)}
                </div>
              );
            })}
            <TodayLine index={todayIndex} />
          </div>

          {groups.map((group) => (
            <div className="gantt-group" key={group.key}>
              <div className="gantt-group-label">{group.label}</div>
              <div
                className="gantt-group-span"
                style={{ width: timelineWidth }}
                aria-hidden
              >
                <TodayLine index={todayIndex} />
              </div>

              {/* One task per row — overlapping bars never share a track. */}
              {group.bars.map((bar) => {
                const left = bar.startIndex * DAY_PX + 2;
                const width = Math.max(bar.daySpan * DAY_PX - 4, DAY_PX - 4);
                const label = `${formatTaskNumber(bar.task.number)} ${bar.task.title}`;
                const href = `/workspaces/${workspaceId}/tasks/${bar.task.id}`;
                const dateTitle = `${label}（${formatDateOnly(bar.start)} ～ ${formatDateOnly(bar.end)}）`;
                const busy = savingId === bar.task.id;
                return (
                  <div className="gantt-row" key={bar.task.id}>
                    <Link
                      href={href}
                      className="gantt-task-label"
                      title={label}
                    >
                      <span className="gantt-task-number">
                        {formatTaskNumber(bar.task.number)}
                      </span>
                      <span className="gantt-task-title">{bar.task.title}</span>
                    </Link>
                    <div className="gantt-track" style={{ width: timelineWidth }}>
                      <div className="gantt-day-lines" aria-hidden />
                      <TodayLine index={todayIndex} />
                      <div
                        className={`gantt-bar${busy ? " is-saving" : ""}`}
                        style={{ left, width }}
                        title={dateTitle}
                        role="link"
                        tabIndex={0}
                        aria-label={dateTitle}
                        onClick={(ev) => {
                          if (suppressClickRef.current) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            return;
                          }
                          router.push(href);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            router.push(href);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="gantt-bar-handle gantt-bar-handle-start"
                          aria-label={`${label}の開始日を変更`}
                          disabled={busy}
                          onPointerDown={(ev) => {
                            const trackEl = ev.currentTarget.closest(
                              ".gantt-track",
                            ) as HTMLElement | null;
                            if (!trackEl) return;
                            beginDrag(
                              "start",
                              bar.task,
                              trackEl,
                              rangeStart,
                              dayCount,
                              ev,
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="gantt-bar-handle gantt-bar-handle-end"
                          aria-label={`${label}の期限日を変更`}
                          disabled={busy}
                          onPointerDown={(ev) => {
                            const trackEl = ev.currentTarget.closest(
                              ".gantt-track",
                            ) as HTMLElement | null;
                            if (!trackEl) return;
                            beginDrag(
                              "end",
                              bar.task,
                              trackEl,
                              rangeStart,
                              dayCount,
                              ev,
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
