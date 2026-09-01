import { useRouter } from "next/router";
import NoteCard from "components/notes/NoteCard";
import { AnyTask, TrackerProps } from "types/types";
import { SectionPanel, sectionBodyClass } from "components/ui/trackerSection";
import { useProjects } from "context/ProjectsContext";

const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f97316', '#84cc16', '#14b8a6', '#6366f1',
];

function projectColor(id: number) {
  return PROJECT_COLORS[id % PROJECT_COLORS.length];
}

type SubtaskProgress = { done: number; total: number };

export default function TaskTable({
  meetings,
  work,
  collapsedMeetings,
  collapsedWork,
  notes,
  subtaskProgressByParentId,
}: TrackerProps) {
  /**
   * Determines if a task is marked as done.
   * @param t - The task object to check
   * @returns True if the task's effective_is_done or is_done property is truthy, false otherwise
   */
  const router = useRouter();
  const { projects } = useProjects();
  const isDone = (t: any) => Boolean(t.effective_is_done ?? t.is_done);
  const isAutoDoneMeeting = (t: any) => t.effective_is_done && !t.is_done;

  // ✅ Use collapsed arrays if provided; otherwise use original arrays
  const meetingsBase = (collapsedMeetings ?? meetings) as AnyTask[];
  const workBase = (collapsedWork ?? work) as AnyTask[];

  // ✅ Option 1: hide subtasks in weekly view (show badge on parents only)
  const meetingsToRender = meetingsBase.filter((t: any) => !t.parent);
  const workToRender = workBase.filter((t: any) => !t.parent);

  const dateLabel = (t: any) => String(t.begin_date ?? "").slice(0, 10);


  const deadlineBadge = (t: AnyTask) => {
    const dl = (t as any).deadline_date as string | null | undefined;
    if (!dl || isDone(t)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deadline = new Date(dl + 'T00:00:00');
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
    if (diffDays > 3) return null;
    return (
      <span
        className={`shrink-0 text-[11px] px-2 py-0.5 rounded border whitespace-nowrap ${
          diffDays < 0
            ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        }`}
        title={diffDays < 0 ? `Overdue (due ${dl})` : `Due ${dl}`}
      >
        ⚑ {diffDays < 0 ? 'Overdue' : diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`}
      </span>
    );
  };

  const recurrenceBadge = (t: AnyTask) => {
    const freq = (t as any).recurring_frequency;
    if (!freq || t.__collapsed) return null;
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
        ↻ {freq}
      </span>
    );
  };

  const progressBadge = (t: AnyTask) => {
    const prog = subtaskProgressByParentId?.[Number(t.id)];
    if (!prog || prog.total <= 0) return null;

    return (
      <span
        className="text-[11px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 whitespace-nowrap"
        title="Subtask progress"
      >
        {prog.done}/{prog.total}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-full lg:min-h-0">
      {/* MEETINGS */}
      <div className="lg:col-span-3 lg:min-h-0">
      <SectionPanel title="MEETINGS" right={`${meetingsToRender.length} total`} children={(
        <div className={`${sectionBodyClass} rounded-lg border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-10`}>
            <table className="w-full text-sm table-fixed">
              <tbody>
                {meetingsToRender.map((t: AnyTask) => (
                  <tr
                    key={t.id}
                    className={`border-b last:border-b-0 transition-colors duration-150 hover:bg-white/60 dark:hover:bg-white/5 ${
                      isDone(t)
                        ? isAutoDoneMeeting(t)
                          ? "bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20"
                          : "bg-green-50 dark:bg-green-900 dark:bg-opacity-20"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-sm leading-tight">🗓️</span>

                        {(() => {
                          const proj = (t as any).project != null
                            ? projects.find(p => p.id === (t as any).project)
                            : null;
                          const color = proj ? (proj.color ?? projectColor(proj.id)) : null;
                          return color ? (
                            <span
                              className="shrink-0 inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                              title={proj?.name}
                            />
                          ) : null;
                        })()}

                        <span
                          className={`min-w-0 truncate font-medium leading-tight ${
                            isDone(t)
                              ? "text-gray-500 dark:text-gray-500 line-through"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>

                        {/* Weekly: show subtask progress badge on parent rows */}
                        {progressBadge(t)}
                        {recurrenceBadge(t)}
                        {deadlineBadge(t)}

                        {t.__collapsed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            Daily ↻ ({t.__occurrenceCount ?? 1}x)
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!meetingsToRender.length && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No meetings this week.
              </div>
            )}
        </div>
      )} />
      </div>

      {/* WORK */}
      <div className="lg:col-span-6 lg:min-h-0">
      <SectionPanel title="WORK" right={`${workToRender.length} total`} children={(
        <div className={`${sectionBodyClass} rounded-lg border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-10`}>
          <table className="w-full text-sm table-fixed">
            <tbody>
              {workToRender.map((t: AnyTask) => (
                <tr
                  key={t.id}
                  className={`font-medium border-b last:border-b-0 transition-colors duration-150 hover:bg-white dark:hover:bg-white/5 ${
                    isDone(t) ? "bg-green-50 dark:bg-green-900 dark:bg-opacity-20" : ""
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={`font-medium truncate leading-tight ${
                          isDone(t)
                            ? "text-gray-500 dark:text-gray-500 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </div>

                      {/* Weekly: show subtask progress badge on parent rows */}
                      {progressBadge(t)}
                      {recurrenceBadge(t)}
                      {deadlineBadge(t)}

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount ?? 1}x)
                        </span>
                      ) : null}
                    </div>
                  </td>

                </tr>
              ))}

              {!workToRender.length && (
                <tr>
                  <td colSpan={1} className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    No work items this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )} />
      </div>

      {/* NOTES */}
      <div className="lg:col-span-3 lg:min-h-0">
      <SectionPanel title="NOTES" right={<a href="/notes" className="text-xs text-blue-500 hover:underline">All notes →</a>} children={(
        <div className={`${sectionBodyClass} rounded-lg border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-10`}>
          {notes.length ? (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id}>
                  <NoteCard
                    note={n}
                    variant="dashed"
                    showMeta={false}
                    onView={(id) => router.push(`/tasks/view/${id}`)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No notes.</div>
          )}
        </div>
      )} />
      </div>
    </div>
  );
}
