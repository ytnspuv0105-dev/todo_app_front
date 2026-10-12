"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const numberHead = (
    <th scope="col" className="task-col-number">
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
  );
  const typeHead = (
    <th scope="col" className="task-col-type">
      種別
    </th>
  );
  const titleHead = (
    <th scope="col" className="task-col-title">
      件名
    </th>
  );
  const restHead = (
    <>
      <th scope="col">状態</th>
      <th scope="col">優先度</th>
      <th scope="col">担当者</th>
      <th scope="col">開始日</th>
      <th scope="col">期限日</th>
      <th scope="col">カテゴリー</th>
      <th scope="col">マイルストーン</th>
      <th scope="col">更新日</th>
    </>
  );

  return (
    <div className="task-table-wrap" role="region" aria-label="課題一覧表" tabIndex={0}>
      <table className={`task-table${phone ? " is-frozen-cols" : ""}`}>
        <thead>
          <tr>
            {phone ? (
              <>
                {numberHead}
                {titleHead}
                {typeHead}
                {restHead}
              </>
            ) : (
              <>
                {numberHead}
                {typeHead}
                {titleHead}
                {restHead}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const numberCell = (
              <td className="task-table-nowrap task-col-number">
                <Link
                  className="task-number"
                  href={`/workspaces/${workspaceId}/tasks/${task.id}`}
                  aria-label={`課題 ${formatTaskNumber(task.number)} の詳細`}
                >
                  {formatTaskNumber(task.number)}
                </Link>
              </td>
            );
            const typeCell = <td className="task-col-type">{labelOf(ISSUE_TYPES, task.issue_type)}</td>;
            const titleCell = (
              <td className="task-table-title task-col-title">
                <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                  {task.title}
                </Link>
              </td>
            );
            const restCells = (
              <>
                <td>{labelOf(STATUSES, task.status)}</td>
                <td>{labelOf(PRIORITIES, task.priority)}</td>
                <td>{dash(task.assignee_name)}</td>
                <td className="task-table-nowrap">{dash(task.start_date)}</td>
                <td className="task-table-nowrap">{dash(task.due_date)}</td>
                <td>{dash(task.category)}</td>
                <td>{dash(task.milestone)}</td>
                <td className="task-table-nowrap">{formatUpdatedAt(task.updated_at)}</td>
              </>
            );
            return (
              <tr key={task.id}>
                {phone ? (
                  <>
                    {numberCell}
                    {titleCell}
                    {typeCell}
                    {restCells}
                  </>
                ) : (
                  <>
                    {numberCell}
                    {typeCell}
                    {titleCell}
                    {restCells}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
