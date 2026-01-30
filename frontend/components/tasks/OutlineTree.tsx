import React from 'react';
import { categoryToType } from '../../lib/dailyLog';

type Node = any;

type Props = {
  nodes: Node[];
  depth?: number;

  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function OutlineRow({
  node,
  depth,
  onView,
  onEdit,
  onDelete,
}: {
  node: Node;
  depth: number;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const type = categoryToType(node.category);

  return (
    <li
      className="border-b px-4 py-3 flex justify-between items-start group"
      style={{ paddingLeft: 16 + depth * 20 }}
    >
      <div className="min-w-0">
        <button
          onClick={(e) => { e.preventDefault(); onView(node.id); }}
          className="text-lg font-semibold text-blue-600 hover:underline text-left truncate"
          title={node.title}
        >
          {type === 'meeting' ? '🗓️ ' : type === 'task' ? '☐ ' : '• '}
          {node.title}
        </button>

        <p className="text-xs text-gray-500 mt-1">
          {(node.priority ?? '').toUpperCase()} • {node.begin_date ?? '—'}
        </p>
      </div>

      <div className="flex-shrink-0 hidden group-hover:flex space-x-3">
        <button
          onClick={() => onEdit(node.id)}
          className="text-sm text-yellow-600 hover:text-yellow-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(node.id)}
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
          />
          {n.children?.length ? (
            <OutlineTree
              nodes={n.children}
              depth={depth + 1}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : null}
        </React.Fragment>
      ))}
    </ul>
  );
}
