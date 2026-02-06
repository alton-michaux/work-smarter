import React from 'react';
import OutlineTree from './OutlineTree';
import NoteCard from 'components/notes/NoteCard';
import { TaskLayoutProps } from 'types/types';

export function TaskLayout({ sections, onView, onEdit, onDelete, onToggleDone }: TaskLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Meetings (1/3) */}
      <section className="lg:col-span-4">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">MEETINGS</h2>
        <div className="rounded border bg-white max-h-[60vh] overflow-auto">
          {sections.meetings.length ? (
            <OutlineTree nodes={sections.meetings} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No meetings.</div>
          )}
        </div>
      </section>

      {/* RIGHT: Tasks (2/3) */}
      <section className="lg:col-span-8">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">TASKS</h2>
        <div className="rounded border bg-white max-h-[60vh] overflow-auto">
          {sections.tasks.length ? (
            <OutlineTree
              nodes={sections.tasks}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
            />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No tasks.</div>
          )}
        </div>
      </section>

      {/* FULL WIDTH: Notes (stays below) */}
      <section className="lg:col-span-12">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">NOTES</h2>

        <div className="rounded border bg-white p-4">
          {sections.notes.length ? (
            <div className="space-y-3">
              {sections.notes.map((n: any) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={() => onDelete(n)} // keep your existing delete signature
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No notes.</div>
          )}
        </div>
      </section>
    </div>
  );
}
