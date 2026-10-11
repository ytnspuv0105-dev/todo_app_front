import Link from "next/link";
import { Task } from "@/lib/api";
import { dash, formatTaskNumber, formatUpdatedAt } from "@/lib/taskDisplay";
import { ISSUE_TYPES, PRIORITIES, STATUSES, labelOf } from "@/lib/labels";

export type NumberSort = "asc" | "desc" | null;

type Props = {
  tasks: Task[];
  workspaceId: number;
  numberSort: NumberSort;
  onToggleNumberSort: () => void;
};

export default function TaskTable({
  tasks,
  workspaceId,
  numberSort,
  onToggleNumberSort,
}: Props) {
  const numberSortLabel =
    numberSort === "asc" ? "昇順" : numberSort === "desc" ? "降順" : "更新日順";

  return (
    <div className="task-table-wrap" role="region" aria-label="課題一覧表" tabIndex={0}>
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col">
              <button
                type="button"
                className={`task-sort-btn${numberSort ? " is-active" : ""}`}
                onClick={onToggleNumberSort}
                aria-label={`番号で並べ替え（現在: ${numberSortLabel}）`}
              >
                番号
                <span className="task-sort-ind" aria-hidden="true">
                  {numberSort === "asc" ? "↑" : numberSort === "desc" ? "↓" : "↕"}
                </span>
              </button>
            </th>
            <th scope="col">種別</th>
            <th scope="col">件名</th>
            <th scope="col">状態</th>
            <th scope="col">優先度</th>
            <th scope="col">担当者</th>
            <th scope="col">開始日</th>
            <th scope="col">期限日</th>
            <th scope="col">カテゴリー</th>
            <th scope="col">マイルストーン</th>
            <th scope="col">更新日</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="task-table-nowrap">
                <Link
                  className="task-number"
                  href={`/workspaces/${workspaceId}/tasks/${task.id}`}
                  aria-label={`課題 ${formatTaskNumber(task.number)} の詳細`}
                >
                  {formatTaskNumber(task.number)}
                </Link>
              </td>
              <td>{labelOf(ISSUE_TYPES, task.issue_type)}</td>
              <td className="task-table-title">
                <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                  {task.title}
                </Link>
              </td>
              <td>{labelOf(STATUSES, task.status)}</td>
              <td>{labelOf(PRIORITIES, task.priority)}</td>
              <td>{dash(task.assignee_name)}</td>
              <td className="task-table-nowrap">{dash(task.start_date)}</td>
              <td className="task-table-nowrap">{dash(task.due_date)}</td>
              <td>{dash(task.category)}</td>
              <td>{dash(task.milestone)}</td>
              <td className="task-table-nowrap">{formatUpdatedAt(task.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
