import React from "react";
import OutlineTree from "./OutlineTree";
import { TaskLayoutProps, PanelProps } from "types/types";

function SectionPanel({ title, right, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full ${className}`}
    >
      <div className="shrink-0 flex items-baseline justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        <h2 className="text-[11px] font-semibold tracking-widest text-gray-600 dark:text-gray-400">
          {title}
        </h2>
        {right ? <div className="text-xs text-gray-400 dark:text-gray-500">{right}</div> : null}
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
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* LEFT: Meetings ~1/3 */}
      <div className="min-h-[200px] lg:min-h-0 lg:w-[34%] lg:shrink-0 min-w-0">
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
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No meetings.
              </div>
            )}
          </div>
        </SectionPanel>
      </div>

      {/* RIGHT: Tasks ~2/3 */}
      <div className="min-h-[200px] lg:min-h-0 flex-1 min-w-0">
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
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No tasks.
              </div>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}