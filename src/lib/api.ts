export type User = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
};

export type Workspace = {
  id: number;
  name: string;
  created_by_id: number;
  created_at: string;
  my_role: string | null;
};

export type WorkspaceMember = {
  id: number;
  user_id: number;
  role: string;
  joined_at: string;
  email: string | null;
  display_name: string | null;
};

export type Invite = {
  id: number;
  workspace_id: number;
  token: string;
  role: string;
  created_at: string;
  expires_at: string | null;
  invite_path: string;
};

export type InviteInfo = {
  workspace_id: number;
  workspace_name: string;
  role: string;
  expires_at: string | null;
};

export type Attachment = {
  id: number;
  task_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_id: number;
  created_at: string;
};

export type Task = {
  id: number;
  number: number;
  workspace_id: number;
  issue_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  due_date: string | null;
  start_date: string | null;
  category: string | null;
  milestone: string | null;
  parent_id: number | null;
  parent_number: number | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  related_task_ids: number[];
  related_task_numbers: number[];
  child_ids: number[];
  child_numbers: number[];
  attachments: Attachment[];
  assignee_name: string | null;
};

export type TaskInput = {
  issue_type?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: number | null;
  due_date?: string | null;
  start_date?: string | null;
  category?: string | null;
  milestone?: string | null;
  parent_number?: number | null;
  related_task_numbers?: number[];
};

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL が設定されていません");
  return base.replace(/\/$/, "");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail || "リクエストに失敗しました");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function signup(data: {
  email: string;
  password: string;
  display_name: string;
}) {
  return request<{ access_token: string; user: User }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(data: { email: string; password: string }) {
  return request<{ access_token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function me(token: string) {
  return request<User>("/auth/me", {}, token);
}

export type ProfileUpdate = {
  display_name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
};

export function updateProfile(token: string, data: ProfileUpdate) {
  return request<User>(
    "/auth/me",
    { method: "PATCH", body: JSON.stringify(data) },
    token,
  );
}

export function listWorkspaces(token: string) {
  return request<Workspace[]>("/workspaces", {}, token);
}

export function createWorkspace(token: string, name: string) {
  return request<Workspace>(
    "/workspaces",
    { method: "POST", body: JSON.stringify({ name }) },
    token,
  );
}

export function getWorkspace(token: string, id: number) {
  return request<Workspace>(`/workspaces/${id}`, {}, token);
}

export function listMembers(token: string, workspaceId: number) {
  return request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, {}, token);
}

export function createInvite(token: string, workspaceId: number, role = "worker") {
  return request<Invite>(
    `/workspaces/${workspaceId}/invites`,
    { method: "POST", body: JSON.stringify({ role }) },
    token,
  );
}

export function getInviteInfo(inviteToken: string) {
  return request<InviteInfo>(`/invites/${inviteToken}`);
}

export function joinInvite(token: string, inviteToken: string) {
  return request<Workspace>(`/invites/${inviteToken}/join`, { method: "POST" }, token);
}

export type TaskChangeItem = {
  label: string;
  before: string | null;
  after: string | null;
};

export type TaskChangeHistory = {
  id: number;
  workspace_id: number;
  task_id: number;
  task_number: number;
  task_title: string;
  kind: string;
  changes: TaskChangeItem[];
  /** Present when this row is tied to a task comment. */
  comment_id?: number | null;
  created_by_id: number;
  /** Null when the actor cannot be resolved; omit in UI (do not invent). */
  created_by_name: string | null;
  created_at: string;
};

export type TaskComment = {
  id: number;
  task_id: number;
  author_id: number;
  author_name: string | null;
  body: string;
  created_at: string;
  updated_at: string | null;
};

export function listTasks(token: string, workspaceId: number) {
  return request<Task[]>(`/workspaces/${workspaceId}/tasks`, {}, token);
}

export function listTaskHistory(token: string, workspaceId: number, limit = 20) {
  return request<TaskChangeHistory[]>(
    `/workspaces/${workspaceId}/task-history?limit=${limit}`,
    {},
    token,
  );
}

export function listTaskDetailHistory(
  token: string,
  workspaceId: number,
  taskId: number,
  limit = 100,
) {
  return request<TaskChangeHistory[]>(
    `/workspaces/${workspaceId}/tasks/${taskId}/history?limit=${limit}`,
    {},
    token,
  );
}

export function getTask(token: string, workspaceId: number, taskId: number) {
  return request<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`, {}, token);
}

export function createTask(token: string, workspaceId: number, data: TaskInput) {
  return request<Task>(
    `/workspaces/${workspaceId}/tasks`,
    { method: "POST", body: JSON.stringify(data) },
    token,
  );
}

export function updateTask(
  token: string,
  workspaceId: number,
  taskId: number,
  data: Record<string, unknown>,
) {
  return request<Task>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    { method: "PATCH", body: JSON.stringify(data) },
    token,
  );
}

export function deleteTask(token: string, workspaceId: number, taskId: number) {
  return request<void>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    { method: "DELETE" },
    token,
  );
}

export function listComments(token: string, workspaceId: number, taskId: number) {
  return request<TaskComment[]>(
    `/workspaces/${workspaceId}/tasks/${taskId}/comments`,
    {},
    token,
  );
}

export function createComment(
  token: string,
  workspaceId: number,
  taskId: number,
  body: string,
) {
  return request<TaskComment>(
    `/workspaces/${workspaceId}/tasks/${taskId}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
    token,
  );
}

export function updateComment(
  token: string,
  workspaceId: number,
  taskId: number,
  commentId: number,
  body: string,
) {
  return request<TaskComment>(
    `/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`,
    { method: "PATCH", body: JSON.stringify({ body }) },
    token,
  );
}

export async function uploadAttachment(
  token: string,
  workspaceId: number,
  taskId: number,
  file: File,
) {
  const form = new FormData();
  form.append("file", file);
  return request<Attachment>(
    `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
    { method: "POST", body: form },
    token,
  );
}

export function deleteAttachment(
  token: string,
  workspaceId: number,
  attachmentId: number,
) {
  return request<void>(
    `/workspaces/${workspaceId}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function downloadAttachment(
  token: string,
  workspaceId: number,
  attachmentId: number,
  filename: string,
) {
  const res = await fetch(
    `${getBaseUrl()}/workspaces/${workspaceId}/attachments/${attachmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    throw new ApiError(res.status, "ダウンロードに失敗しました");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
