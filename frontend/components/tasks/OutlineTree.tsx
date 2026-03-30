import React, { useState, useEffect, useRef } from 'react';
import { categoryToType } from '../../lib/dailyLog';
import { OutlineTreeProps, OutlineRowProps } from 'types/types';
import { useTasks } from 'context/TasksContext';
import { useProjects } from 'context/ProjectsContext';

const PRIORITY_BORDER: Record<string, string> = {
  high:   '#ef4444',
  urgent: '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
};

const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f97316', '#84cc16', '#14b8a6', '#6366f1',
];

function projectColor(id: number) {
  return PROJECT_COLORS[id % PROJECT_COLORS.length];
}

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
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

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

  const effectiveDepth = Math.max(depth, isSubtask ? 1 : 0);

  const { projects } = useProjects();
  const priorityBorder = PRIORITY_BORDER[String(node.priority ?? '').toLowerCase()] ?? 'transparent';
  const projectObj = node.project != null ? projects.find(p => p.id === node.project) : null;
  const pColor = projectObj ? projectColor(projectObj.id) : null;

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
      setSubtaskTitle('');
      setShowSubtask(false);
    } finally {
      setSaving(false);
    }
  };

  const isDone = Boolean((node as any).effective_is_done ?? node.is_done);

  return (
    <li
      className={[
        "group relative",
        "border-b border-gray-100 last:border-b-0",
        "px-4",
        "py-2.5",
        "hover:bg-gray-50/70",
        "transition-colors",
        "flex items-start justify-between gap-4",
        "focus-within:bg-gray-50/70",
      ].join(" ")}
      style={{
        paddingLeft: 16 + effectiveDepth * 18,
        borderLeft: `3px solid ${priorityBorder}`,
      }}
    >
      {/* LEFT: checkbox/icon + content */}
      <div className="min-w-0 flex-1 flex items-start gap-3">
        <div className="pt-0.5">
          {type === 'task' ? (
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={!!node.is_done}
              onChange={(e) => onToggleDone?.(Number(node.id), e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
            />
          ) : (
            <span className="text-base leading-none">
              {type === 'meeting' ? '🗓️' : '•'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onView(Number(node.id));
            }}
            className={[
              "block w-full text-left",
              "font-medium",
              "truncate",
              isDone ? "text-gray-500 line-through" : "text-gray-900",
              "hover:text-blue-700",
              "focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-sm",
            ].join(" ")}
            title={node.title}
          >
            <span className="flex items-center gap-2 min-w-0">
              {pColor && (
                <span
                  className="shrink-0 inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: pColor }}
                  title={projectObj?.name}
                />
              )}
              <span className="truncate">{node.title}</span>

              {!isSubtask && childCount > 0 && (
                <span
                  className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-600"
                  title="Subtask progress"
                >
                  {doneChildCount}/{childCount}
                </span>
              )}

              {node.is_recurring && (
                <span className="shrink-0 text-[11px] text-gray-400" title="Recurring">
                  🔁
                </span>
              )}
            </span>
          </button>

          <div className="mt-1 text-xs text-gray-500">
            <span className="uppercase tracking-wide">
              {(node.priority ?? '—').toString()}
            </span>
            <span className="mx-2 text-gray-300">•</span>
            <span>{node.begin_date ?? '—'}</span>
          </div>

          {/* Inline Add Subtask */}
          {!isSubtask && type === 'task' && showSubtask && (
            <div className="mt-2 pl-7">
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="New subtask…"
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSubtask(false);
                    if (e.key === 'Enter') submitSubtask();
                  }}
                  disabled={saving}
                  autoFocus
                />
                <button
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                  disabled={saving || !subtaskTitle.trim() || !onAddSubtask}
                  onClick={submitSubtask}
                  type="button"
                >
                  Add
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Enter to save • Esc to cancel
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: actions (hidden until hover/focus) */}
      <div className="shrink-0 flex items-center gap-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        {!isSubtask && type === 'task' && (
          <button
            onClick={() => setShowSubtask((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-900"
            type="button"
          >
            + Subtask
          </button>
        )}

        <button
          onClick={() => onEdit(Number(node.id))}
          className="text-sm text-amber-700 hover:text-amber-900"
          type="button"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(node)}
          className="text-sm text-red-600 hover:text-red-800"
          type="button"
        >
          Delete
        </button>
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
  onAddSubtask,
}: OutlineTreeProps) {
  const { addSubtask } = useTasks();

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
