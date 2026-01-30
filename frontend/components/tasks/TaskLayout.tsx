import React from 'react';
import OutlineTree from './OutlineTree';

type Props = {
  sections: {
    meetings: any[];
    tasks: any[];
    notes: any[];
  };
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function TaskLayout({ sections, onView, onEdit, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Meetings (1/3) */}
      <section className="lg:col-span-4">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">MEETINGS</h2>
        <div className="rounded border bg-white">
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
        <div className="rounded border bg-white">
          {sections.tasks.length ? (
            <OutlineTree nodes={sections.tasks} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No tasks.</div>
          )}
        </div>
      </section>

      {/* FULL WIDTH: Notes (stays below) */}
      <section className="lg:col-span-12">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">NOTES</h2>
        <div className="rounded border bg-white">
          {sections.notes.length ? (
            <OutlineTree nodes={sections.notes} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No notes.</div>
          )}
        </div>
      </section>
    </div>
  );
}
