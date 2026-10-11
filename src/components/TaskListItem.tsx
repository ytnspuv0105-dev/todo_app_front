import Link from "next/link";
import { Task } from "@/lib/api";
import { formatTaskNumber, taskFieldRows } from "@/lib/taskDisplay";

type Props = {
  task: Task;
  workspaceId: number;
};

export default function TaskListItem({ task, workspaceId }: Props) {
  const fields = taskFieldRows(task);
  const title = fields.find((f) => f.key === "title")!;
  const rest = fields.filter((f) => f.key !== "title" && f.key !== "number");

  return (
    <li className="task-card">
      <div className="task-card-head">
        <span className="task-number" aria-label="課題番号">
          {formatTaskNumber(task.number)}
        </span>
        <Link
          className="task-card-title"
          href={`/workspaces/${workspaceId}/tasks/${task.id}`}
        >
          {title.value}
        </Link>
      </div>
      <dl className="task-card-fields">
        {rest.map((f) => (
          <div
            key={f.key}
            className={`task-card-field${f.key === "description" ? " is-desc" : ""}`}
          >
            <dt>{f.label}</dt>
            <dd title={f.title}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
