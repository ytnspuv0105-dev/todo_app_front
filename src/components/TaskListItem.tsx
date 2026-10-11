import Link from "next/link";
import { Task } from "@/lib/api";
import { ISSUE_TYPES, PRIORITIES, STATUSES, labelOf } from "@/lib/labels";

type Props = {
  task: Task;
  workspaceId: number;
};

export default function TaskListItem({ task, workspaceId }: Props) {
  return (
    <li className="list-item">
      <div>
        <Link className="title" href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
          #{task.id} {task.title}
        </Link>
        <div className="meta">
          <span className="badge">{labelOf(ISSUE_TYPES, task.issue_type)}</span>
          <span className="badge ok">{labelOf(STATUSES, task.status)}</span>
          <span className="badge warn">優先度 {labelOf(PRIORITIES, task.priority)}</span>
          {task.assignee_name ? (
            <span className="badge">担当: {task.assignee_name}</span>
          ) : null}
          {task.parent_id ? <span className="badge">親 #{task.parent_id}</span> : null}
        </div>
      </div>
      <Link className="btn btn-ghost" href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
        詳細
      </Link>
    </li>
  );
}
