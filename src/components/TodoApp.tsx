"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import {
  Todo,
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@/lib/api";

type Filter = "all" | "active" | "done";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listTodos();
        if (!cancelled) setTodos(data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Todo の読み込みに失敗しました。API が起動しているか確認してください。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  function withErrorClear() {
    setError(null);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    withErrorClear();
    startTransition(async () => {
      try {
        const created = await createTodo(value);
        setTodos((prev) => [created, ...prev]);
        setTitle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "作成に失敗しました");
      }
    });
  }

  async function onToggle(todo: Todo) {
    withErrorClear();
    const next = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: next } : t)),
    );
    try {
      const updated = await updateTodo(todo.id, { completed: next });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: todo.completed } : t,
        ),
      );
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  }

  async function saveEdit(todo: Todo) {
    const value = editTitle.trim();
    if (!value || value === todo.title) {
      setEditingId(null);
      return;
    }
    withErrorClear();
    try {
      const updated = await updateTodo(todo.id, { title: value });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "タイトルの更新に失敗しました");
    }
  }

  async function onDelete(id: number) {
    withErrorClear();
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTodo(id);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setTodos(snapshot);
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <main className="app-shell">
      <h1 className="brand">シンプルTodo</h1>
      <p className="lede">今日やることを、すっきり残しておきましょう。</p>

      <section className="panel" aria-label="Todo リスト">
        <form className="composer" onSubmit={onCreate}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新しいタスクを入力"
            aria-label="新しいタスク"
            maxLength={500}
            disabled={pending}
          />
          <button className="btn btn-primary" type="submit" disabled={pending || !title.trim()}>
            追加
          </button>
        </form>

        <div className="filters" role="group" aria-label="表示フィルタ">
          {(
            [
              ["all", "すべて"],
              ["active", "未完了"],
              ["done", "完了"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="filter-btn"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <p className={`status${error ? " error" : ""}`} role="status">
          {error
            ? error
            : loading
              ? "読み込み中…"
              : pending
                ? "保存中…"
                : `${visible.length} 件`}
        </p>

        {loading ? null : visible.length === 0 ? (
          <p className="empty">タスクはまだありません</p>
        ) : (
          <ul className="todo-list">
            {visible.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item${todo.completed ? " completed" : ""}`}
              >
                <button
                  type="button"
                  className="check"
                  aria-label={todo.completed ? "未完了にする" : "完了にする"}
                  aria-checked={todo.completed}
                  role="checkbox"
                  onClick={() => onToggle(todo)}
                >
                  {todo.completed ? (
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3 8.5l3.2 3.2L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>

                {editingId === todo.id ? (
                  <input
                    className="todo-edit"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveEdit(todo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveEdit(todo);
                      }
                      if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    aria-label="タイトルを編集"
                    autoFocus
                    maxLength={500}
                  />
                ) : (
                  <button
                    type="button"
                    className="todo-title"
                    onClick={() => startEdit(todo)}
                  >
                    {todo.title}
                  </button>
                )}

                <div className="actions">
                  {editingId === todo.id ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => saveEdit(todo)}
                    >
                      保存
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => startEdit(todo)}
                    >
                      編集
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDelete(todo.id)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
