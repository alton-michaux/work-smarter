import React from "react";
import OutlineTree from "./OutlineTree";
import { TaskLayoutProps, PanelProps } from "types/types";

function SectionPanel({ title, right, children, className = "", fill = true }: PanelProps) {
  return (
    <section
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col ${fill ? "h-full" : "max-h-full"} ${className}`}
    >
      <div className="shrink-0 flex items-baseline justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        <h2 className="text-[11px] font-semibold tracking-widest text-gray-600 dark:text-gray-400">
          {title}
        </h2>
        {right ? <div className="text-xs text-gray-400 dark:text-gray-500">{right}</div> : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
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
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
      {/* LEFT: Meetings — narrow, hugs its content instead of stretching */}
      <div className="lg:w-[28%] lg:shrink-0 min-w-0 lg:self-start lg:max-h-full">
        <SectionPanel title="MEETINGS" right={`${meetingsCount} total`} fill={false}>
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
        </SectionPanel>
      </div>

      {/* RIGHT: Tasks — takes all remaining height */}
      <div className="min-h-[200px] lg:min-h-0 flex-1 min-w-0 lg:h-full">
        <SectionPanel title="TASKS" right={`${tasksCount} total`}>
          {tasksCount ? (
            <OutlineTree
              nodes={sections.tasks}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              density="compact"
            />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No tasks.
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}