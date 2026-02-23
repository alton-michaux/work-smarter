import React from "react";
import OutlineTree from "./OutlineTree";
import NoteCard from "components/notes/NoteCard";
import { TaskLayoutProps } from "types/types";

type PanelProps = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function SectionPanel({ title, right, children, className = "" }: PanelProps) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70 rounded-t-lg">
        <h2 className="text-[11px] font-semibold tracking-widest text-gray-600">
          {title}
        </h2>
        {right ? <div className="text-xs text-gray-400">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TaskLayout({
  sections,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
}: TaskLayoutProps) {
  const meetingsCount = sections.meetings?.length ?? 0;
  const tasksCount = sections.tasks?.length ?? 0;
  const notesCount = sections.notes?.length ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Meetings */}
      <div className="lg:col-span-4">
        <SectionPanel title="MEETINGS" right={`${meetingsCount} total`}>
          <div className="p-3">
            <div className="rounded-md border border-gray-100 bg-white max-h-[56vh] overflow-auto">
              {meetingsCount ? (
                <OutlineTree
                  nodes={sections.meetings}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No meetings.
                </div>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* RIGHT: Tasks */}
      <div className="lg:col-span-8">
        <SectionPanel title="TASKS" right={`${tasksCount} total`}>
          <div className="p-3">
            <div className="rounded-md border border-gray-100 bg-white max-h-[56vh] overflow-auto">
              {tasksCount ? (
                <OutlineTree
                  nodes={sections.tasks}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleDone={onToggleDone}
                />
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No tasks.
                </div>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* FULL WIDTH: Notes */}
      <div className="lg:col-span-12">
        <SectionPanel
          title="NOTES"
          right={
            <span className="text-xs text-gray-400">
              Ongoing • {notesCount} total
            </span>
          }
        >
          <div className="p-4">
            {notesCount ? (
              <div className="space-y-3">
                {sections.notes.map((n: any) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    variant="dashed"
                    showMeta={false}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={() => onDelete(n)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No notes.</div>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}