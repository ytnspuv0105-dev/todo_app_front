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
  parseDateOnly,
} from "@/lib/gantt";
import { isJapaneseHoliday, weekdayLabel } from "@/lib/jpHoliday";
import { formatTaskNumber } from "@/lib/taskDisplay";

type Props = {
  workspaceId: number;
  token: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
};

const DAY_PX = 40;
const SAVE_ERROR = "日付の保存に失敗しました";

type DragMode = "start" | "end" | "move";

type DragSession = {
  taskId: number;
  mode: DragMode;
  track: HTMLElement;
  rangeStart: Date;
  dayCount: number;
  hasStartDate: boolean;
  hasDueDate: boolean;
  /** Day index under the pointer when the drag began (move mode). */
  anchorDayIndex: number;
  /** Inclusive bar extents at drag start (for move shift). */
  originStart: string;
  originDue: string;
  /** Working dates during the drag (null = leave that field empty). */
  start: string | null;
  due: string | null;
  originalStart: string | null;
  originalDue: string | null;
};

type DateDraft = {
  start_date: string | null;
  due_date: string | null;
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

function TodayColumn({ index }: { index: number }) {
  if (index < 0) return null;
  return (
    <div
      className="gantt-today-col"
      style={{ left: index * DAY_PX, width: DAY_PX }}
      aria-hidden
    />
  );
}

function isOffday(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6 || isJapaneseHoliday(d);
}

/** Light-gray columns for Saturday, Sunday, and holidays. Today is omitted. */
function OffdayColumns({
  days,
  todayKey,
}: {
  days: Date[];
  todayKey: string;
}) {
  return days.map((d, index) => {
    const key = formatDateOnly(d);
    if (key === todayKey || !isOffday(d)) return null;
    return (
      <div
        key={key}
        className="gantt-offday-col"
        style={{ left: index * DAY_PX, width: DAY_PX }}
        aria-hidden
      />
    );
  });
}

function shiftInclusiveBar(
  originStart: string,
  originDue: string,
  delta: number,
  rangeStart: Date,
  dayCount: number,
): { start: string; due: string } {
  const start0 = parseDateOnly(originStart)!;
  const due0 = parseDateOnly(originDue)!;
  const span = dayDiff(start0, due0);
  let start = addDays(start0, delta);
  let due = addDays(due0, delta);
  const rangeEnd = addDays(rangeStart, dayCount - 1);

  if (start.getTime() < rangeStart.getTime()) {
    start = rangeStart;
    due = addDays(start, span);
  }
  if (due.getTime() > rangeEnd.getTime()) {
    due = rangeEnd;
    start = addDays(due, -span);
  }
  if (start.getTime() < rangeStart.getTime()) {
    start = rangeStart;
  }
  return { start: formatDateOnly(start), due: formatDateOnly(due) };
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
    clearDraft(session.taskId);
  }

  function applyDraft(taskId: number, start: string | null, due: string | null) {
    setDrafts((prev) => ({
      ...prev,
      [taskId]: { start_date: start, due_date: due },
    }));
  }

  function previewDrag(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const dayIdx = dayIndexFromClientX(clientX, drag.track, drag.dayCount);
    const dayStr = formatDateOnly(addDays(drag.rangeStart, dayIdx));

    if (drag.mode === "move") {
      const delta = dayIdx - drag.anchorDayIndex;
      if (drag.hasStartDate && drag.hasDueDate) {
        const shifted = shiftInclusiveBar(
          drag.originStart,
          drag.originDue,
          delta,
          drag.rangeStart,
          drag.dayCount,
        );
        drag.start = shifted.start;
        drag.due = shifted.due;
      } else if (drag.hasStartDate) {
        const shifted = shiftInclusiveBar(
          drag.originStart,
          drag.originStart,
          delta,
          drag.rangeStart,
          drag.dayCount,
        );
        drag.start = shifted.start;
        drag.due = null;
      } else {
        const shifted = shiftInclusiveBar(
          drag.originDue,
          drag.originDue,
          delta,
          drag.rangeStart,
          drag.dayCount,
        );
        drag.start = null;
        drag.due = shifted.due;
      }
      applyDraft(drag.taskId, drag.start, drag.due);
      return;
    }

    let start = drag.start ?? dayStr;
    let due = drag.due ?? dayStr;
    if (drag.mode === "start") {
      start = dayStr > due ? due : dayStr;
    } else {
      due = dayStr < start ? start : dayStr;
    }
    drag.start = start;
    drag.due = due;
    applyDraft(drag.taskId, start, due);
  }

  function beginDrag(
    mode: DragMode,
    task: Task,
    track: HTMLElement,
    rangeStart: Date,
    dayCount: number,
    e: ReactPointerEvent<HTMLElement>,
  ) {
    e.preventDefault();
    e.stopPropagation();
    movedRef.current = false;
    suppressClickRef.current = false;

    const hasStartDate = !!task.start_date;
    const hasDueDate = !!task.due_date;
    const originStart = task.start_date ?? task.due_date!;
    const originDue = task.due_date ?? task.start_date!;
    const captureEl = e.currentTarget;
    const anchorDayIndex = dayIndexFromClientX(e.clientX, track, dayCount);

    dragRef.current = {
      taskId: task.id,
      mode,
      track,
      rangeStart,
      dayCount,
      hasStartDate,
      hasDueDate,
      anchorDayIndex,
      originStart,
      originDue,
      start: hasStartDate ? task.start_date : hasDueDate ? null : originStart,
      due: hasDueDate ? task.due_date : hasStartDate ? null : originDue,
      originalStart: task.start_date,
      originalDue: task.due_date,
    };

    // Edge drag previews use both ends filled (may introduce the missing date).
    if (mode === "start" || mode === "end") {
      dragRef.current.start = originStart;
      dragRef.current.due = originDue;
      applyDraft(task.id, originStart, originDue);
    } else {
      applyDraft(
        task.id,
        dragRef.current.start,
        dragRef.current.due,
      );
    }

    try {
      captureEl.setPointerCapture(e.pointerId);
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
      captureEl.removeEventListener("pointermove", onMove);
      captureEl.removeEventListener("pointerup", finish);
      captureEl.removeEventListener("pointercancel", finish);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      try {
        if (captureEl.hasPointerCapture(ev.pointerId)) {
          captureEl.releasePointerCapture(ev.pointerId);
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

      const finalStart = session.start;
      const finalDue = session.due;

      const unchanged =
        !movedRef.current ||
        (original.start_date === finalStart && original.due_date === finalDue);

      if (unchanged) {
        restoreOriginalDates(session);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        return;
      }

      const payload: Record<string, unknown> = {};
      if (session.mode === "move") {
        if (session.hasStartDate && session.hasDueDate) {
          payload.start_date = finalStart;
          payload.due_date = finalDue;
          payload.clear_start_date = false;
          payload.clear_due_date = false;
        } else if (session.hasStartDate) {
          payload.start_date = finalStart;
          payload.clear_start_date = false;
        } else {
          payload.due_date = finalDue;
          payload.clear_due_date = false;
        }
      } else if (original.start_date && original.due_date) {
        if (session.mode === "start") {
          payload.start_date = finalStart;
          payload.clear_start_date = false;
        } else {
          payload.due_date = finalDue;
          payload.clear_due_date = false;
        }
      } else {
        // Single-date bar edge drag can introduce the missing date.
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

    captureEl.addEventListener("pointermove", onMove, { passive: false });
    captureEl.addEventListener("pointerup", finish);
    captureEl.addEventListener("pointercancel", finish);
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
        バーをドラッグして期間を移動、端で開始日・期限日を変更できます。
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
              const dow = weekdayLabel(d);
              const holiday = isJapaneseHoliday(d);
              const tone = holiday
                ? " is-holiday"
                : d.getDay() === 0
                  ? " is-sunday"
                  : d.getDay() === 6
                    ? " is-saturday"
                    : "";
              return (
                <div
                  key={key}
                  className={`gantt-tick${d.getDate() === 1 ? " is-month" : ""}${isToday ? " is-today" : ""}${tone}`}
                  style={{ width: DAY_PX }}
                  title={isToday ? `${key}（${dow}・今日）` : `${key}（${dow}）`}
                  data-gantt-today={isToday ? "true" : undefined}
                  data-gantt-holiday={holiday ? "true" : undefined}
                >
                  <span className="gantt-tick-date">{formatTickLabel(d)}</span>
                  <span className="gantt-tick-weekday">{dow}</span>
                </div>
              );
            })}
          </div>

          {groups.map((group) => (
            <div className="gantt-group" key={group.key}>
              <div className="gantt-group-label">{group.label}</div>
              <div
                className="gantt-group-span"
                style={{ width: timelineWidth }}
                aria-hidden
              >
                <OffdayColumns days={days} todayKey={todayKey} />
                <TodayColumn index={todayIndex} />
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
                      <OffdayColumns days={days} todayKey={todayKey} />
                      <TodayColumn index={todayIndex} />
                      <div
                        className={`gantt-bar${busy ? " is-saving" : ""}`}
                        style={{ left, width }}
                        title={dateTitle}
                        role="link"
                        tabIndex={0}
                        aria-label={dateTitle}
                        onPointerDown={(ev) => {
                          if (
                            (ev.target as HTMLElement).closest(
                              ".gantt-bar-handle",
                            )
                          ) {
                            return;
                          }
                          const trackEl = ev.currentTarget.closest(
                            ".gantt-track",
                          ) as HTMLElement | null;
                          if (!trackEl || busy) return;
                          beginDrag(
                            "move",
                            bar.task,
                            trackEl,
                            rangeStart,
                            dayCount,
                            ev,
                          );
                        }}
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
