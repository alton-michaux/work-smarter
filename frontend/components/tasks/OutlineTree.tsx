import React from 'react';
import { categoryToType } from '../../lib/dailyLog';

type Node = any;

type Props = {
  nodes: Node[];
  depth?: number;

  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleDone?: (id: number, isDone: boolean) => void;
};

function OutlineRow({
  node,
  depth,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
}: {
  node: Node;
  depth: number;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleDone?: (id: number, isDone: boolean) => void;
}) {
  const type = categoryToType(node.category);

  return (
    <li
      className="border-b px-4 py-3 flex justify-between items-start group"
      style={{ paddingLeft: 16 + depth * 20 }}
    >
      {/* LEFT/MIDDLE: checkbox + content */}
      <div className="min-w-0 flex-1 flex items-start gap-3">
        {/* checkbox/icon MUST NOT be inside any <button> */}
        <div className="mt-1">
          {type === 'task' ? (
            <input
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

        <div className="min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onView(Number(node.id));
            }}
            className="text-lg font-semibold text-blue-600 hover:underline text-left block max-w-full truncate"
            title={node.title}  // tooltip on hover
          >
            <span className="flex items-center gap-2">
              <span className="truncate">{node.title}</span>

              {node.is_recurring && (
                <span
                  className="text-xs opacity-60"
                  title="Recurring task"
                >
                  🔁
                </span>
              )}
            </span>
          </button>

          <p className="text-xs text-gray-500 mt-1">
            {(node.priority ?? '').toUpperCase()} • {node.begin_date ?? '—'}
          </p>
        </div>
      </div>

      {/* RIGHT: actions */}
      <div className="flex-shrink-0 group-hover:flex space-x-3">
        <button onClick={() => onEdit(Number(node.id))} className="text-sm text-yellow-600 hover:text-yellow-800">
          Edit
        </button>
        <button onClick={() => onDelete(Number(node.id))} className="text-sm text-red-600 hover:text-red-800">
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
}: Props) {
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
          />
          {n.children?.length ? (
            <OutlineTree
              nodes={n.children}
              depth={depth + 1}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
            />
          ) : null}
        </React.Fragment>
      ))}
    </ul>
  );
}
