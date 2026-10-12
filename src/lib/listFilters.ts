/** Query keys for the existing task-list filters. Do not add filter types. */
export const LIST_QUERY = {
  title: "q",
  issueType: "issue_type",
  status: "status",
  assignee: "assignee",
} as const;

const STORAGE_PREFIX = "todo-list-filters:";

export type ListFilterValues = {
  q: string;
  issueType: string;
  status: string;
  assignee: string;
};

export function buildListSearch(values: ListFilterValues): string {
  const params = new URLSearchParams();
  if (values.q) params.set(LIST_QUERY.title, values.q);
  if (values.issueType) params.set(LIST_QUERY.issueType, values.issueType);
  if (values.status) params.set(LIST_QUERY.status, values.status);
  if (values.assignee) params.set(LIST_QUERY.assignee, values.assignee);
  return params.toString();
}

export function listFiltersFromSearch(search: string): ListFilterValues {
  const params = new URLSearchParams(search);
  return {
    q: params.get(LIST_QUERY.title) ?? "",
    issueType: params.get(LIST_QUERY.issueType) ?? "",
    status: params.get(LIST_QUERY.status) ?? "",
    assignee: params.get(LIST_QUERY.assignee) ?? "",
  };
}

function storageKey(workspaceId: number): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

/** Remember the list address so 課題一覧 on the detail page returns to it. */
export function rememberListFilters(workspaceId: number, search: string): void {
  if (typeof window === "undefined") return;
  const key = storageKey(workspaceId);
  if (search) sessionStorage.setItem(key, search);
  else sessionStorage.removeItem(key);
}

export function rememberedListHref(workspaceId: number): string {
  const base = `/workspaces/${workspaceId}/tasks`;
  if (typeof window === "undefined") return base;
  const search = sessionStorage.getItem(storageKey(workspaceId));
  return search ? `${base}?${search}` : base;
}
