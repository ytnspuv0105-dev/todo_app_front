import Link from "next/link";
import HistoryCreateFields from "@/components/HistoryCreateFields";
import { TaskChangeHistory, TaskChangeItem } from "@/lib/api";
import { formatTaskNumber, formatUpdatedAt } from "@/lib/taskDisplay";

type Props = {
  entry: TaskChangeHistory;
  workspaceId: number;
};

const COMMENT_LABEL = "コメント";
const BODY_PREVIEW = 80;

function isEmptyBefore(before: string | null | undefined): boolean {
  return before == null || before === "" || before === "（空）";
}

function truncateBody(text: string, limit = BODY_PREVIEW): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= limit) return t;
  return `${t.slice(0, limit)}…`;
}

function FieldDiff({ change }: { change: TaskChangeItem }) {
  return (
    <li>
      <span className="history-change-label">{change.label}</span>
      {": "}
      <span className="history-before">{change.before ?? "（空）"}</span>
      {" → "}
      <span className="history-after">{change.after ?? "（空）"}</span>
    </li>
  );
}

export default function TaskHistoryItem({ entry, workspaceId }: Props) {
  const detailHref = `/workspaces/${workspaceId}/tasks/${entry.task_id}`;
  const actor = entry.created_by_name?.trim() || null;
  const commentChange = entry.changes.find((c) => c.label === COMMENT_LABEL);
  const otherChanges = entry.changes.filter((c) => c.label !== COMMENT_LABEL);
  const isCommentEdit =
    !!commentChange && !isEmptyBefore(commentChange.before) && !!commentChange.after;
  const isNewComment =
    !!commentChange && isEmptyBefore(commentChange.before) && !!commentChange.after?.trim();

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
        <div className="history-body">
          <p className="history-create-label">作成</p>
          <HistoryCreateFields changes={entry.changes} />
        </div>
      ) : (
        <div className="history-body">
          {isCommentEdit ? (
            <ul className="history-changes">
              <FieldDiff
                change={{
                  label: COMMENT_LABEL,
                  before: commentChange!.before,
                  after: commentChange!.after,
                }}
              />
              {otherChanges.map((c, i) => (
                <FieldDiff key={`${c.label}-${i}`} change={c} />
              ))}
            </ul>
          ) : null}
          {isNewComment ? (
            <>
              <p
                className="history-comment-body"
                title={commentChange!.after ?? undefined}
              >
                {truncateBody(commentChange!.after ?? "")}
              </p>
              {otherChanges.length > 0 ? (
                <ul className="history-changes">
                  {otherChanges.map((c, i) => (
                    <FieldDiff key={`${c.label}-${i}`} change={c} />
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
          {!isCommentEdit && !isNewComment ? (
            entry.kind === "comment" ? (
              <p className="history-comment-label">コメント</p>
            ) : (
              <ul className="history-changes">
                {entry.changes.map((c, i) => (
                  <FieldDiff key={`${c.label}-${i}`} change={c} />
                ))}
              </ul>
            )
          ) : null}
        </div>
      )}
    </li>
  );
}
