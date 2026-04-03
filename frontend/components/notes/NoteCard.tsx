import React from 'react';
import { NoteProps } from 'types/types';
import MarkdownBody from 'components/shared/MarkdownBody';

export default function NoteCard({
  note,
  onView,
  onEdit,
  onDelete,
  showMeta = true,
  variant = 'default',
}: NoteProps) {
  const id = Number(note.id);
  const title = String(note.title ?? '').trim() || 'Untitled note';
  const date = (note.begin_date ?? '').slice(0, 10);
  const priority = note.priority ? String(note.priority).toUpperCase() : '';

  const border =
    variant === 'dashed'
      ? 'border-dashed border-gray-300'
      : 'border-gray-200';

  return (
    <div className={border + "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"}>
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => onView?.(id)}
          className="flex items-start gap-2 min-w-0 text-left"
        >
          {note.is_done && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 my-auto">
              done
            </span>
          )}
          <span className="text-gray-400 mt-0.5">📌</span>
          <div className="min-w-0">
            <h3
              className={`text-sm font-semibold truncate ${
                note.is_done ? 'text-gray-500' : 'text-gray-800'
              }`}
            >
              {note.title}
            </h3>
            {note.description && (
              <div
                className={`mt-1 text-sm leading-snug ${note.is_done ? 'opacity-60' : ''}`}
                style={variant === 'dashed' ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } : undefined}
              >
                <MarkdownBody value={note.description} emptyText="" />
              </div>
            )}
            {showMeta && (date || priority) ? (
              <div className="text-xs text-gray-500 mt-1">
                {priority}
                {priority && date ? ' • ' : ''}
                {date}
              </div>
            ) : null}
          </div>
        </button>

        {(onEdit || onDelete) ? (
          <div className="flex-shrink-0 flex items-center gap-3">
            {onEdit ? (
              <button type="button" onClick={() => onEdit(id)} className="text-sm text-yellow-600 hover:text-yellow-800">
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" onClick={() => onDelete(id)} className="text-sm text-red-600 hover:text-red-800">
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
