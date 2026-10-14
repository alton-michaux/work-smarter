import React, { useState, useEffect, useRef, useCallback } from 'react';
import { categoryToType } from '../../lib/dailyLog';
import { OutlineTreeProps, OutlineRowProps, TaskNode } from 'types/types';
import { useTasks } from 'context/TasksContext';
import { useProjects } from 'context/ProjectsContext';
import { useClientValue } from 'hooks/useClientValue';

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

// Mirrors Task.MAX_SUBTASK_DEPTH on the backend: parent -> subtask -> sub-subtask.
const MAX_SUBTASK_DEPTH = 2;

// A parent reads as in progress once anything below it, at any level, has moved.
function hasStartedDescendant(node: TaskNode): boolean {
  return (node.children ?? []).some(
    (c) => c.status === 'in_progress' || Boolean(c.is_done) || hasStartedDescendant(c)
  );
}

function projectColor(id: number) {
  return PROJECT_COLORS[id % PROJECT_COLORS.length];
}

function deadlineStatus(
  deadlineDate: string | null | undefined,
  isDone: boolean
): 'overdue' | 'soon' | null {
  if (!deadlineDate || isDone) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate + 'T00:00:00');
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return null;
}

function formatTime(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function OutlineRow({
  node,
  depth,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
  onSetStatus,
  onAddSubtask,
  isCollapsed = false,
  onToggleCollapse,
  drag,
  density = 'comfortable',
}: OutlineRowProps) {
  const type = categoryToType(node.category);
  const isCompact = density === 'compact';

  const [showSubtask, setShowSubtask] = useState(false);
  // The whole row is the drag image, but only the handle starts a drag —
  // otherwise selecting the title text would drag the row.
  const [armed, setArmed] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const isSubtask = Boolean(node.parent);

  const childCount = Array.isArray(node.children) ? node.children.length : 0;
  const doneChildCount = childCount
    ? node.children.filter((c) => Boolean(c.is_done)).length
    : 0;

  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!checkboxRef.current) return;

    const shouldIndeterminate =
      childCount > 0 &&
      doneChildCount > 0 &&
      doneChildCount < childCount;

    checkboxRef.current.indeterminate = shouldIndeterminate;
  }, [childCount, doneChildCount]);

  const effectiveDepth = Math.max(depth, isSubtask ? 1 : 0);
  const canAddSubtask = type === 'task' && effectiveDepth < MAX_SUBTASK_DEPTH;

  const { projects } = useProjects();
  const priorityBorder = PRIORITY_BORDER[String(node.priority ?? '').toLowerCase()] ?? 'transparent';
  const projectObj = node.project != null ? projects.find(p => p.id === node.project) : null;
  const pColor = projectObj ? (projectObj.color ?? projectColor(projectObj.id)) : null;

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

  const isDone = Boolean(node.effective_is_done ?? node.is_done);
  const isInProgress = type === 'task' && !isDone && node.status === 'in_progress';
  // Display only: a parent reads as in progress once any subtask is moving.
  const isRollupInProgress =
    type === 'task' && !isDone && !isInProgress && hasStartedDescendant(node);

  return (
    <li
      className={[
        "group relative",
        "border-b border-gray-100 dark:border-gray-700 last:border-b-0",
        "px-4",
        isCompact ? "py-1.5" : "py-2.5",
        "hover:bg-gray-50 dark:hover:bg-gray-700",
        "transition-colors",
        "focus-within:bg-gray-50 dark:focus-within:bg-gray-700",
        drag?.isDragging ? "opacity-40" : "",
      ].join(" ")}
      style={{
        paddingLeft: 16 + effectiveDepth * 18,
        borderLeft: `3px solid ${priorityBorder}`,
      }}
      draggable={drag ? armed : undefined}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDragLeave={drag?.onDragLeave}
      onDrop={drag?.onDrop}
      onDragEnd={drag ? () => { setArmed(false); drag.onDragEnd(); } : undefined}
    >
      {drag?.dropEdge && (
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute left-0 right-0 h-0.5 bg-blue-500",
            drag.dropEdge === 'before' ? "-top-px" : "-bottom-px",
          ].join(" ")}
        />
      )}

      {/* Main row */}
      <div className="relative flex items-start justify-between gap-4">
        {/* LEFT: checkbox/icon + content */}
        <div className={[
          "min-w-0 flex-1 flex gap-2",
          isCompact ? "items-center" : "items-start",
        ].join(" ")}>
          {drag && (
            <div className={isCompact ? "shrink-0 flex items-center" : "pt-0.5"}>
              <button
                type="button"
                onMouseDown={() => setArmed(true)}
                onMouseUp={() => setArmed(false)}
                onKeyDown={(e) => {
                  if (!e.altKey) return;
                  if (e.key === 'ArrowUp' && drag.canMoveUp) {
                    e.preventDefault();
                    drag.onMove(-1);
                  }
                  if (e.key === 'ArrowDown' && drag.canMoveDown) {
                    e.preventDefault();
                    drag.onMove(1);
                  }
                }}
                aria-label={`Reorder ${node.title}. Press Alt with the up or down arrow to move it.`}
                title="Drag to reorder · Alt+↑/↓"
                className="flex h-4 w-4 cursor-grab items-center justify-center rounded text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 active:cursor-grabbing transition-opacity"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M7 4h2v2H7V4zm4 0h2v2h-2V4zM7 9h2v2H7V9zm4 0h2v2h-2V9zm-4 5h2v2H7v-2zm4 0h2v2h-2v-2z" />
                </svg>
              </button>
            </div>
          )}

          <div className={isCompact ? "shrink-0 flex items-center" : "pt-0.5"}>
            {childCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse?.(String(node.id));
                }}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? `Expand ${node.title}` : `Collapse ${node.title}`}
                title={isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                className="flex h-4 w-4 items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={[
                    "h-3.5 w-3.5 transition-transform",
                    isCollapsed ? "" : "rotate-90",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <path d="M7 5l6 5-6 5V5z" />
                </svg>
              </button>
            ) : (
              <span className="inline-block h-4 w-4" aria-hidden="true" />
            )}
          </div>

          <div className={isCompact ? "shrink-0 flex items-center" : "pt-0.5"}>
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

          <div className={[
            "min-w-0 flex-1",
            isCompact ? "flex items-center gap-3" : "",
          ].join(" ")}>
            <div className={[
              isCompact ? "min-w-0 flex-1" : "",
              "flex items-center gap-1.5 min-w-0",
            ].join(" ")}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onView(Number(node.id));
                }}
                className={[
                  "min-w-0 flex items-center gap-1.5 text-left",
                  "font-medium",
                  isDone ? "text-gray-500 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-100",
                  "hover:text-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-sm",
                ].join(" ")}
                title={node.title}
              >
                {pColor && (
                  <span
                    className="shrink-0 inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: pColor }}
                    title={projectObj?.name}
                  />
                )}
                <span className="truncate">{node.title}</span>
              </button>

              {childCount > 0 && (
                <span
                  className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  title="Subtask progress"
                >
                  {doneChildCount}/{childCount}
                </span>
              )}

              {isInProgress ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus?.(Number(node.id), 'open');
                  }}
                  disabled={!onSetStatus}
                  className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default"
                  title={onSetStatus ? "In progress · click to stop" : "In progress"}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                  In progress
                </button>
              ) : isRollupInProgress && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  title="A subtask is in progress or done"
                >
                  In progress
                </span>
              )}

              {node.is_recurring && (
                <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500" title="Recurring">
                  🔁
                </span>
              )}
            </div>

            <div className={[
              isCompact
                ? "shrink-0 flex items-center gap-x-1.5"
                : "mt-1 flex flex-wrap items-center gap-x-1.5",
              "text-xs text-gray-500 dark:text-gray-400",
            ].join(" ")}>
              <span className="whitespace-nowrap uppercase tracking-wide">
                {(node.priority ?? '—').toString()}
              </span>
              {node.category === 'meeting' && node.google_event_id && (
                <span
                  className="whitespace-nowrap inline-flex items-center gap-1 text-green-700 dark:text-green-400"
                  title="Synced to Google Calendar"
                >
                  <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  Synced
                </span>
              )}
              {type === 'meeting' && node.begin_time && (
                <span className="whitespace-nowrap">
                  <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                  {formatTime(node.begin_time)}
                  {node.end_time ? ` – ${formatTime(node.end_time)}` : ''}
                </span>
              )}
              {node.deadline_date && (() => {
                const st = deadlineStatus(node.deadline_date, isDone);
                return (
                  <span
                    className={[
                      'whitespace-nowrap',
                      st === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' :
                      st === 'soon'    ? 'text-amber-600 dark:text-amber-400 font-medium' :
                                         'text-gray-500 dark:text-gray-400',
                    ].join(' ')}
                  >
                    <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                    ⚑ {node.deadline_date}
                  </span>
                );
              })()}
              {type !== 'meeting' && (
                <span className="whitespace-nowrap">
                  <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                  {node.begin_date ?? '—'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT: actions (hidden until hover/focus). They overlay the row
            instead of taking layout width, so titles get the full line; the
            gradient lead-in fades covered text out instead of chopping it
            mid-letter. */}
        <div className={[
          "absolute right-0 h-6 flex items-center gap-3 bg-gray-50 dark:bg-gray-700 pl-1 pr-1",
          isCompact ? "top-1/2 -translate-y-1/2" : "top-0",
          "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity",
        ].join(" ")}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full top-0 h-full w-8 bg-gradient-to-l from-gray-50 dark:from-gray-700 to-transparent"
          />
          {type === 'task' && !isDone && !isInProgress && onSetStatus && (
            <button
              onClick={() => onSetStatus(Number(node.id), 'in_progress')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              type="button"
            >
              Start
            </button>
          )}

          {canAddSubtask && (
            <button
              onClick={() => setShowSubtask((v) => !v)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              type="button"
            >
              + Subtask
            </button>
          )}

          <button
            onClick={() => onEdit(Number(node.id))}
            className="text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded"
            type="button"
            aria-label={`Edit ${node.title}`}
            title="Edit"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(node)}
            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded"
            type="button"
            aria-label={`Delete ${node.title}`}
            title="Delete"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline Add Subtask — sits below the row so it can expand without
          breaking the single-line layout in compact mode. */}
      {canAddSubtask && showSubtask && (
        <div className="mt-2 pl-7">
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={saving || !subtaskTitle.trim() || !onAddSubtask}
              onClick={submitSubtask}
              type="button"
            >
              Add
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Enter to save • Esc to cancel
          </div>
        </div>
      )}
    </li>
  );
}


/**
 * Collapse state for parent rows, keyed by task id. Owned by the root tree and
 * threaded down so nested levels share one source of truth. When `storageKey`
 * is given the state survives reloads and date changes.
 */
function readStoredIds(storageKey?: string): string | null {
  if (!storageKey) return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function parseIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    // Ignore malformed state — collapse is a convenience.
    return new Set();
  }
}

function useCollapsedIds(storageKey?: string) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  // localStorage is only readable after hydration; both are null until then.
  const hydrated = useClientValue(() => true);
  const stored = useClientValue(() => readStoredIds(storageKey));

  // Load the saved set whenever what's stored differs from what we last read
  // (first client render, or a different storageKey).
  const [loadedRaw, setLoadedRaw] = useState<string | null>(null);
  if (stored !== loadedRaw) {
    setLoadedRaw(stored);
    setCollapsedIds(parseIds(stored));
  }

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...collapsedIds]));
    } catch {
      // Ignore quota/private-mode failures.
    }
  }, [collapsedIds, storageKey, hydrated]);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { collapsedIds, toggleCollapsed };
}

export default function OutlineTree({
  nodes,
  depth = 0,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
  onSetStatus,
  onAddSubtask,
  collapsedIds: collapsedIdsProp,
  onToggleCollapse,
  storageKey,
  reorderable = false,
  density = 'comfortable',
}: OutlineTreeProps) {
  const { addSubtask, reorderSubtasks } = useTasks();

  // Nested levels receive the root's state; the root owns it.
  const own = useCollapsedIds(storageKey);
  const collapsedIds = collapsedIdsProp ?? own.collapsedIds;
  const toggleCollapsed = onToggleCollapse ?? own.toggleCollapsed;

  // This list is reorderable only when it *is* a sibling group: every node a
  // subtask of the same parent. The root list and mixed lists stay static, and
  // so does any view that might be showing a filtered subset of siblings.
  const sharedParent =
    reorderable && depth > 0 && nodes.length > 1 && nodes[0]?.parent != null
      ? Number(nodes[0].parent)
      : null;
  const canReorder =
    sharedParent != null &&
    nodes.every((n) => Number(n.parent) === sharedParent);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<
    { id: number; edge: 'before' | 'after' } | null
  >(null);

  const commitMove = useCallback(
    (movingId: number, targetId: number, edge: 'before' | 'after') => {
      if (sharedParent == null || movingId === targetId) return;

      const ids = nodes.map((n) => Number(n.id));
      if (!ids.includes(movingId) || !ids.includes(targetId)) return;

      // Compute the insert point against the list the moved row has left, so
      // dropping below a row that sat above it lands where the user aimed.
      const without = ids.filter((id) => id !== movingId);
      const anchor = without.indexOf(targetId);
      const next = [...without];
      next.splice(edge === 'before' ? anchor : anchor + 1, 0, movingId);

      // A drop onto the row's own edge changes nothing — don't hit the network.
      if (next.every((id, i) => id === ids[i])) return;

      reorderSubtasks(sharedParent, next);
    },
    [nodes, reorderSubtasks, sharedParent]
  );

  const moveByOffset = useCallback(
    (movingId: number, direction: -1 | 1) => {
      if (sharedParent == null) return;

      const ids = nodes.map((n) => Number(n.id));
      const from = ids.indexOf(movingId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ids.length) return;

      const next = [...ids];
      next.splice(to, 0, ...next.splice(from, 1));
      reorderSubtasks(sharedParent, next);
    },
    [nodes, reorderSubtasks, sharedParent]
  );

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
      {nodes.map((n, index) => {
        const isCollapsed = collapsedIds.has(String(n.id));
        const id = Number(n.id);

        const drag = canReorder
          ? {
              isDragging: draggingId === id,
              dropEdge:
                dropTarget?.id === id && draggingId !== null && draggingId !== id
                  ? dropTarget.edge
                  : null,
              onDragStart: (e: React.DragEvent) => {
                setDraggingId(id);
                e.dataTransfer.effectAllowed = 'move';
                // Firefox ignores drags that carry no payload.
                e.dataTransfer.setData('text/plain', String(id));
              },
              onDragOver: (e: React.DragEvent) => {
                if (draggingId === null || draggingId === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                const edge =
                  e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                setDropTarget((prev) =>
                  prev?.id === id && prev.edge === edge ? prev : { id, edge }
                );
              },
              onDragLeave: (e: React.DragEvent) => {
                // dragleave bubbles up from the row's own children, so only
                // clear the indicator once the pointer has left the row itself.
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDropTarget((prev) => (prev?.id === id ? null : prev));
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                const edge = dropTarget?.id === id ? dropTarget.edge : 'before';
                if (draggingId !== null) commitMove(draggingId, id, edge);
                setDraggingId(null);
                setDropTarget(null);
              },
              onDragEnd: () => {
                setDraggingId(null);
                setDropTarget(null);
              },
              onMove: (direction: -1 | 1) => moveByOffset(id, direction),
              canMoveUp: index > 0,
              canMoveDown: index < nodes.length - 1,
            }
          : undefined;

        return (
        <React.Fragment key={n.id}>
          <OutlineRow
            node={n}
            depth={depth}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleDone={onToggleDone}
            onSetStatus={onSetStatus}
            onAddSubtask={handleAddSubtask}
            isCollapsed={isCollapsed}
            onToggleCollapse={toggleCollapsed}
            drag={drag}
            density={density}
          />

          {n.children?.length && !isCollapsed ? (
            <OutlineTree
              nodes={n.children}
              depth={depth + 1}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              onSetStatus={onSetStatus}
              onAddSubtask={handleAddSubtask}
              collapsedIds={collapsedIds}
              onToggleCollapse={toggleCollapsed}
              reorderable={reorderable}
              density={density}
            />
          ) : null}
        </React.Fragment>
        );
      })}
    </ul>
  );
}
