import React from "react";
import OutlineTree from "./OutlineTree";
import { TaskLayoutProps, PanelProps } from "types/types";

function SectionPanel({ title, right, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col ${className}`}
      style={{ height: 'calc(100vh - 350px)' }}
    >
      <div className="shrink-0 flex items-baseline justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <h2 className="text-[11px] font-semibold tracking-widest text-gray-600">
          {title}
        </h2>
        {right ? <div className="text-xs text-gray-400">{right}</div> : null}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* LEFT: Meetings */}
      <div className="lg:col-span-4">
        <SectionPanel title="MEETINGS" right={`${meetingsCount} total`}>
          <div className="p-3">
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
        </SectionPanel>
      </div>

      {/* RIGHT: Tasks */}
      <div className="lg:col-span-8">
        <SectionPanel title="TASKS" right={`${tasksCount} total`}>
          <div className="p-3">
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
        </SectionPanel>
      </div>
    </div>
  );
}