import Link from "next/link";
import type { CSSProperties } from "react";
import { Task } from "@/lib/api";
import { buildGanttModel, formatDateOnly, formatTickLabel } from "@/lib/gantt";
import { formatTaskNumber } from "@/lib/taskDisplay";

type Props = {
  workspaceId: number;
  tasks: Task[];
};

const DAY_PX = 40;

export default function AssigneeGantt({ workspaceId, tasks }: Props) {
  const model = buildGanttModel(tasks);

  if (!model) {
    return (
      <p className="empty gantt-empty" role="status">
        開始日または期限日が設定された課題はありません。
      </p>
    );
  }

  const { dayCount, days, groups, rangeStart, rangeEnd } = model;
  const timelineWidth = dayCount * DAY_PX;

  return (
    <div className="gantt">
      <p className="gantt-range muted">
        表示期間: {formatDateOnly(rangeStart)} ～ {formatDateOnly(rangeEnd)}
      </p>
      <div className="gantt-scroll" role="region" aria-label="ガントチャート">
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
            {days.map((d) => (
              <div
                key={formatDateOnly(d)}
                className="gantt-tick"
                style={{ width: DAY_PX }}
                title={formatDateOnly(d)}
              >
                {formatTickLabel(d)}
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <div className="gantt-group" key={group.key}>
              <div className="gantt-group-label">{group.label}</div>
              <div
                className="gantt-group-span"
                style={{ width: timelineWidth }}
                aria-hidden
              />

              {group.bars.map((bar) => {
                const left = bar.startIndex * DAY_PX;
                const width = Math.max(bar.daySpan * DAY_PX - 4, DAY_PX - 4);
                const label = `${formatTaskNumber(bar.task.number)} ${bar.task.title}`;
                const href = `/workspaces/${workspaceId}/tasks/${bar.task.id}`;
                const dateTitle = `${label}（${formatDateOnly(bar.start)} ～ ${formatDateOnly(bar.end)}）`;
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
                      <Link
                        href={href}
                        className="gantt-bar"
                        style={{ left, width }}
                        title={dateTitle}
                        aria-label={dateTitle}
                      >
                        <span className="sr-only">{dateTitle}</span>
                      </Link>
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
