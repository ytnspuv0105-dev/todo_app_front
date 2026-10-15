import { TaskChangeItem } from "@/lib/api";

const EMPTY = "（空）";

function filledCreateValues(changes: TaskChangeItem[]) {
  return changes.filter((change) => {
    const value = change.after?.trim() ?? "";
    return value !== "" && value !== EMPTY;
  });
}

/** Create rows list `項目: 値`. No before → after arrow. Empty stored rows render nothing. */
export default function HistoryCreateFields({
  changes,
}: {
  changes: TaskChangeItem[];
}) {
  const filled = filledCreateValues(changes);
  if (filled.length === 0) return null;
  return (
    <ul className="history-changes">
      {filled.map((change, i) => (
        <li key={`${change.label}-${i}`} className="history-create-value">
          <span className="history-change-label">{change.label}</span>
          {": "}
          <span className="history-create-value-text">{change.after}</span>
        </li>
      ))}
    </ul>
  );
}
