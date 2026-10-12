import Link from "next/link";
import { TaskChangeHistory } from "@/lib/api";
import { formatTaskNumber, formatUpdatedAt } from "@/lib/taskDisplay";

type Props = {
  entry: TaskChangeHistory;
  workspaceId: number;
};

export default function TaskHistoryItem({ entry, workspaceId }: Props) {
  const detailHref = `/workspaces/${workspaceId}/tasks/${entry.task_id}`;
  const actor = entry.created_by_name?.trim() || null;

  return (
    <li className="history-item">
      <div className="history-item-head">
        <Link
          className="task-number"
          href={detailHref}
          aria-label={`課題 ${formatTaskNumber(entry.task_number)} の詳細`}
        >
          {formatTaskNumber(entry.task_number)}
        </Link>
        <Link className="history-item-title" href={detailHref}>
          {entry.task_title}
        </Link>
        {actor ? <span className="history-item-actor">{actor}</span> : null}
        <span className="history-item-time muted">
          {formatUpdatedAt(entry.created_at)}
        </span>
      </div>
      {entry.kind === "create" ? (
        <p className="history-create-label">作成</p>
      ) : (
        <ul className="history-changes">
          {entry.changes.map((c, i) => (
            <li key={`${c.label}-${i}`}>
              <span className="history-change-label">{c.label}</span>
              {": "}
              <span className="history-before">{c.before ?? "（空）"}</span>
              {" → "}
              <span className="history-after">{c.after ?? "（空）"}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
