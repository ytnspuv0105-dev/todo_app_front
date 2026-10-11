import Link from "next/link";
import { Task } from "@/lib/api";
import {
  countLabel,
  dash,
  parentChildLabel,
  truncateText,
} from "@/lib/taskDisplay";
import { ISSUE_TYPES, PRIORITIES, STATUSES, labelOf } from "@/lib/labels";

type Props = {
  tasks: Task[];
  workspaceId: number;
};

export default function TaskTable({ tasks, workspaceId }: Props) {
  return (
    <div className="task-table-wrap" role="region" aria-label="課題一覧表" tabIndex={0}>
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col">種別</th>
            <th scope="col">件名</th>
            <th scope="col">詳細</th>
            <th scope="col">状態</th>
            <th scope="col">優先度</th>
            <th scope="col">担当者</th>
            <th scope="col">開始日</th>
            <th scope="col">期限日</th>
            <th scope="col">カテゴリー</th>
            <th scope="col">マイルストーン</th>
            <th scope="col">親子</th>
            <th scope="col">関連</th>
            <th scope="col">添付</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{labelOf(ISSUE_TYPES, task.issue_type)}</td>
              <td className="task-table-title">
                <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                  #{task.id} {task.title}
                </Link>
              </td>
              <td className="task-table-desc" title={task.description || undefined}>
                {truncateText(task.description)}
              </td>
              <td>{labelOf(STATUSES, task.status)}</td>
              <td>{labelOf(PRIORITIES, task.priority)}</td>
              <td>{dash(task.assignee_name)}</td>
              <td className="task-table-nowrap">{dash(task.start_date)}</td>
              <td className="task-table-nowrap">{dash(task.due_date)}</td>
              <td>{dash(task.category)}</td>
              <td>{dash(task.milestone)}</td>
              <td className="task-table-nowrap">{parentChildLabel(task)}</td>
              <td>{countLabel(task.related_task_ids?.length ?? 0)}</td>
              <td>{countLabel(task.attachments?.length ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
