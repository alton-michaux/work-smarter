import React, { useState, useEffect, useRef } from 'react';
import { categoryToType } from '../../lib/dailyLog';
import { OutlineTreeProps, OutlineRowProps } from 'types/types';
import { useTasks } from 'context/TasksContext';

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

  const effectiveDepth = Math.max(depth, isSubtask ? 1 : 0);

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

  return (
    <li
      className={`border-b px-4 flex justify-between items-start group ${
        depth > 0 ? 'py-1.5' : 'py-3'
      }`}
      style={{ paddingLeft: 16 + depth * 20 }}
    >
      {/* LEFT/MIDDLE: checkbox + content */}
      <div className="min-w-0 flex-1 flex items-start gap-3">
        {/* checkbox/icon MUST NOT be inside any <button> */}
        <div className="mt-1">
          {type === 'task' ? (
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={!!node.is_done}
              onChange={(e) => {
                onToggleDone?.(Number(node.id), e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
          ) : (
            <span className="text-lg leading-none">
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
            className="text-lg font-semibold text-blue-600 hover:underline text-left block max-w-full truncate"
            title={node.title}
          >
            <span className="flex items-center gap-2">
              <span className="truncate">{node.title}</span>

              {/* Parent progress badge (only if this node has children) */}
              {!isSubtask && childCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded border text-gray-500"
                  title="Subtask progress"
                >
                  {doneChildCount}/{childCount}
                </span>
              )}

              {node.is_recurring && (
                <span className="text-xs opacity-60" title="Recurring task">
                  🔁
                </span>
              )}
            </span>

          </button>

          <p className="text-xs text-gray-500 mt-1">
            {(node.priority ?? '').toUpperCase()} • {node.begin_date ?? '—'}
          </p>

          {/* Inline Add Subtask UI */}
          {!isSubtask && type === 'task' && showSubtask && (
            <div className="mt-2 pl-7">
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="New subtask..."
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
                  className="rounded border px-2 py-1 text-sm"
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
          )}
        </div>
      </div>

      {/* RIGHT: actions */}
      <div className="flex-shrink-0 group-hover:flex space-x-3">
        {/* Add Subtask action (only for non-subtasks and only tasks) */}
        {!isSubtask && type === 'task' && (
          <button
            onClick={() => setShowSubtask((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            + Subtask
          </button>
        )}

        <button
          onClick={() => onEdit(Number(node.id))}
          className="text-sm text-yellow-600 hover:text-yellow-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(node)}
          className="text-sm text-red-600 hover:text-red-800"
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
  onAddSubtask, // optional override
}: OutlineTreeProps) {
  const { addSubtask } = useTasks();

  // Hoisted handler: if parent passes one, use it; otherwise use context addSubtask
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
    <ul>
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
