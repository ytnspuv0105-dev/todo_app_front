"use client";

import HistoryCreateFields from "@/components/HistoryCreateFields";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownView from "@/components/MarkdownView";
import { TaskChangeHistory, TaskChangeItem, TaskComment } from "@/lib/api";
import { formatUpdatedAt } from "@/lib/taskDisplay";

const COMMENT_LABEL = "コメント";

type Props = {
  entries: TaskChangeHistory[];
  comments: TaskComment[];
  currentUserId: number | null;
  editingCommentId: number | null;
  editingBody: string;
  editBusy: boolean;
  onStartEdit: (comment: TaskComment) => void;
  onChangeEditingBody: (value: string) => void;
  onSaveEdit: (commentId: number) => void;
  onCancelEdit: () => void;
  token: string | null;
  workspaceId: number;
  onUploadImage: (file: File) => Promise<{ id: number; filename: string } | null>;
  onError: (message: string) => void;
};

function isEmptyBefore(before: string | null | undefined): boolean {
  return before == null || before === "" || before === "（空）";
}

function FieldDiff({ change }: { change: TaskChangeItem }) {
  return (
    <li className="history-diff">
      <span className="history-change-label">{change.label}</span>
      <span className="history-diff-sep">: </span>
      <span className="history-before">{change.before ?? "（空）"}</span>
      <span className="history-diff-arrow"> → </span>
      <span className="history-after">{change.after ?? "（空）"}</span>
    </li>
  );
}

function commentParts(entry: TaskChangeHistory) {
  const commentChange = entry.changes.find((c) => c.label === COMMENT_LABEL);
  const fieldChanges = entry.changes.filter((c) => c.label !== COMMENT_LABEL);
  const isCommentEdit =
    !!commentChange && !isEmptyBefore(commentChange.before) && !!commentChange.after;
  const isNewComment =
    !!commentChange && isEmptyBefore(commentChange.before) && !!commentChange.after?.trim();
  return { commentChange, fieldChanges, isCommentEdit, isNewComment };
}

export default function TaskDetailTimeline({
  entries,
  comments,
  currentUserId,
  editingCommentId,
  editingBody,
  editBusy,
  onStartEdit,
  onChangeEditingBody,
  onSaveEdit,
  onCancelEdit,
  token,
  workspaceId,
  onUploadImage,
  onError,
}: Props) {
  if (entries.length === 0) {
    return <p className="empty">まだ履歴はありません</p>;
  }

  const commentsById = new Map(comments.map((c) => [c.id, c]));

  return (
    <ul className="comment-thread detail-timeline">
      {entries.map((entry) => {
        const actor = entry.created_by_name?.trim() || null;
        const { commentChange, fieldChanges, isCommentEdit, isNewComment } =
          commentParts(entry);
        const linked =
          entry.comment_id != null ? commentsById.get(entry.comment_id) : undefined;
        const canEdit =
          !!linked &&
          currentUserId != null &&
          linked.author_id === currentUserId &&
          isNewComment;
        const editing = canEdit && editingCommentId === linked!.id;

        return (
          <li key={entry.id} className="comment-item">
            <div className="comment-item-head">
              {actor ? <span className="comment-author">{actor}</span> : null}
              {canEdit && !editing ? (
                <button
                  type="button"
                  className="btn btn-ghost comment-edit-btn"
                  onClick={() => onStartEdit(linked!)}
                >
                  編集
                </button>
              ) : null}
              <span className="comment-time muted">
                {formatUpdatedAt(entry.created_at)}
              </span>
            </div>

            {entry.kind === "create" ? (
              <div className="history-body">
                <p className="history-create-label">作成</p>
                <HistoryCreateFields changes={entry.changes} />
              </div>
            ) : null}

            {isCommentEdit ? (
              <ul className="history-changes">
                <FieldDiff
                  change={{
                    label: COMMENT_LABEL,
                    before: commentChange!.before,
                    after: commentChange!.after,
                  }}
                />
              </ul>
            ) : null}

            {isNewComment ? (
              editing ? (
                <div className="stack comment-form">
                  <MarkdownEditor
                    label="コメント"
                    labelHidden
                    value={editingBody}
                    onChange={onChangeEditingBody}
                    token={token}
                    workspaceId={workspaceId}
                    maxLength={5000}
                    required
                    imageUpload={onUploadImage}
                    onError={onError}
                  />
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={editBusy || !editingBody.trim()}
                      onClick={() => onSaveEdit(linked!.id)}
                    >
                      コメントを更新
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={editBusy}
                      onClick={onCancelEdit}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <MarkdownView
                  source={commentChange!.after ?? ""}
                  token={token}
                  workspaceId={workspaceId}
                />
              )
            ) : null}

            {entry.kind !== "create" && !isCommentEdit && fieldChanges.length > 0 ? (
              <ul className="history-changes">
                {fieldChanges.map((c, i) => (
                  <FieldDiff key={`${c.label}-${i}`} change={c} />
                ))}
              </ul>
            ) : null}

            {!isCommentEdit &&
            !isNewComment &&
            entry.kind !== "create" &&
            fieldChanges.length === 0 &&
            entry.changes.length > 0 ? (
              <ul className="history-changes">
                {entry.changes.map((c, i) => (
                  <FieldDiff key={`${c.label}-${i}`} change={c} />
                ))}
              </ul>
            ) : null}

            {!isCommentEdit &&
            !isNewComment &&
            entry.kind === "comment" &&
            entry.changes.length === 0 ? (
              <p className="history-comment-label">コメント</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
