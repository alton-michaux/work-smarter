import React, { useEffect, useMemo, useRef, useState } from "react";
import { categoryToType } from "../../lib/dailyLog";
import { OutlineTreeProps, OutlineRowProps } from "types/types";
import { useTasks } from "context/TasksContext";

// Small helper: safe uppercase label
const upper = (v: any) => (typeof v === "string" ? v.toUpperCase() : "");

function OutlineRow({
  node,
  depth,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
  onAddSubtask,
}: OutlineRowProps) {
  const type = categoryToType(node.category);

  const [showSubtask, setShowSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // relies on API field `parent` (number|null)
  const isSubtask = Boolean(node.parent);

  const childCount = Array.isArray(node.children) ? node.children.length : 0;
  const doneChildCount = childCount
    ? node.children.filter((c: any) => Boolean(c.is_done)).length
    : 0;

  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!checkboxRef.current) return;

    const shouldIndeterminate =
      !isSubtask &&
      childCount > 0 &&
      doneChildCount > 0 &&
      doneChildCount < childCount;

    checkboxRef.current.indeterminate = shouldIndeterminate;
  }, [isSubtask, childCount, doneChildCount]);

  const indentPx = useMemo(() => 16 + depth * 18, [depth]);

  const submitSubtask = async () => {
    const title = subtaskTitle.trim();
    if (!title || !onAddSubtask) return;

    setSaving(true);
    try {
      await onAddSubtask({
        parentId: Number(node.id),
        title,
        beginDate: node.begin_date ?? null,
        category: node.category ?? null,
        project: node.project ?? null,
      });
      setSubtaskTitle("");
      setShowSubtask(false);
    } finally {
      setSaving(false);
    }
  };

  const metaLeft = useMemo(() => {
    const p = upper(node.priority ?? "");
    const d = node.begin_date ?? "—";
    if (p) return `${p} • ${d}`;
    return d;
  }, [node.priority, node.begin_date]);

  const showProgress = !isSubtask && childCount > 0;

  return (
    <li
      className={[
        "group relative",
        "border-b border-gray-100 last:border-b-0",
        "hover:bg-gray-50/60",
        "transition-colors",
      ].join(" ")}
      style={{ paddingLeft: indentPx }}
    >
      {/* subtle left rail for nesting */}
      {depth > 0 ? (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-100"
          style={{ marginLeft: indentPx - 10 }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-4 px-4 py-2.5">
        {/* LEFT: checkbox/icon + content */}
        <div className="min-w-0 flex-1 flex items-start gap-3">
          {/* checkbox/icon */}
          <div className="mt-0.5 flex-shrink-0">
            {type === "task" ? (
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={!!node.is_done}
                onChange={(e) => onToggleDone?.(Number(node.id), e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            ) : (
              <span className="text-base leading-none text-gray-500">
                {type === "meeting" ? "🗓️" : "•"}
              </span>
            )}
          </div>

          {/* title + meta */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onView(Number(node.id));
              }}
              className={[
                "w-full text-left",
                "text-sm font-medium",
                node.is_done ? "text-gray-500 line-through" : "text-gray-900",
                "hover:underline hover:decoration-gray-300",
                "truncate",
              ].join(" ")}
              title={node.title}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="truncate">{node.title}</span>

                {showProgress ? (
                  <span
                    className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-600"
                    title="Subtask progress"
                  >
                    {doneChildCount}/{childCount}
                  </span>
                ) : null}

                {node.is_recurring ? (
                  <span
                    className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600"
                    title="Recurring"
                  >
                    ↻
                  </span>
                ) : null}
              </span>
            </button>

            <div className="mt-0.5 text-xs text-gray-500">{metaLeft}</div>

            {/* Inline Add Subtask UI */}
            {!isSubtask && type === "task" && showSubtask ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="New subtask…"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowSubtask(false);
                      if (e.key === "Enter") submitSubtask();
                    }}
                    disabled={saving}
                    autoFocus
                  />
                  <button
                    className={[
                      "rounded-md border px-3 py-1.5 text-sm",
                      "border-gray-200 bg-white hover:bg-gray-50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                    disabled={saving || !subtaskTitle.trim() || !onAddSubtask}
                    onClick={submitSubtask}
                  >
                    Add
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Enter to save • Esc to cancel
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: actions (don’t shove layout around) */}
        <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isSubtask && type === "task" ? (
            <button
              onClick={() => setShowSubtask((v) => !v)}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-white"
            >
              + Subtask
            </button>
          ) : null}

          <button
            onClick={() => onEdit(Number(node.id))}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-white"
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(node)}
            className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-white"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export default function OutlineTree({
  nodes,
  depth = 0,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
  onAddSubtask, // optional override
}: OutlineTreeProps) {
  const { addSubtask } = useTasks();

  // If parent passes one, use it; otherwise use context addSubtask
  const handleAddSubtask =
    onAddSubtask ??
    (async ({
      parentId,
      title,
      beginDate,
      category,
      project,
    }: {
      parentId: number;
      title: string;
      beginDate?: string | null;
      category?: string | null;
      project?: number | null;
    }) => {
      await addSubtask({
        title,
        parent: parentId,
        begin_date: beginDate ?? null,
        category: category ?? null,
        project: project ?? null,
        recurring_task: null,
      });
    });

  return (
    <ul className={depth === 0 ? "divide-y divide-transparent" : ""}>
      {nodes.map((n) => (
        <React.Fragment key={n.id}>
          <OutlineRow
            node={n}
            depth={depth}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleDone={onToggleDone}
            onAddSubtask={handleAddSubtask}
          />

          {n.children?.length ? (
            <OutlineTree
              nodes={n.children}
              depth={depth + 1}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              onAddSubtask={handleAddSubtask}
            />
          ) : null}
        </React.Fragment>
      ))}
    </ul>
  );
}
