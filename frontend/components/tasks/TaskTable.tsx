import { useRouter } from "next/router";
import NoteCard from "components/notes/NoteCard";
import { AnyTask, TrackerProps } from "types/types";
import { SectionPanel, sectionMaxHeightClass } from "components/ui/trackerSection";

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
  const isDone = (t: any) => Boolean(t.effective_is_done ?? t.is_done);
  const isAutoDoneMeeting = (t: any) => t.effective_is_done && !t.is_done;

  // ✅ Use collapsed arrays if provided; otherwise use original arrays
  const meetingsBase = (collapsedMeetings ?? meetings) as AnyTask[];
  const workBase = (collapsedWork ?? work) as AnyTask[];

  // ✅ Option 1: hide subtasks in weekly view (show badge on parents only)
  const meetingsToRender = meetingsBase.filter((t: any) => !t.parent);
  const workToRender = workBase.filter((t: any) => !t.parent);

  const dateLabel = (t: any) => String(t.begin_date ?? "").slice(0, 10);


  const recurrenceBadge = (t: AnyTask) => {
    const freq = (t as any).recurring_frequency;
    if (!freq || t.__collapsed) return null;
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-500 border border-purple-200 whitespace-nowrap">
        ↻ {freq}
      </span>
    );
  };

  const progressBadge = (t: AnyTask) => {
    const prog = subtaskProgressByParentId?.[Number(t.id)];
    if (!prog || prog.total <= 0) return null;

    return (
      <span
        className="text-[11px] px-2 py-0.5 rounded border text-gray-500 whitespace-nowrap"
        title="Subtask progress"
      >
        {prog.done}/{prog.total}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* MEETINGS */}
      <div className="lg:col-span-3">
      <SectionPanel title="MEETINGS" right={`${meetingsToRender.length} total`} children={(
        <div className={`${sectionMaxHeightClass(meetingsToRender.length)} overflow-auto rounded-lg border bg-blue-50/40`}>
            <table className="w-full text-sm table-fixed">
              <thead className="text-[11px] text-gray-600">
                <tr className="border-b">
                  <th className="px-3 py-1.5 text-left uppercase tracking-wide">
                    Title
                  </th>
                </tr>
              </thead>

              <tbody>
                {meetingsToRender.map((t: AnyTask) => (
                  <tr
                    key={t.id}
                    className={`border-b last:border-b-0 transition-colors duration-150 hover:bg-white/60 ${
                      isDone(t)
                        ? isAutoDoneMeeting(t)
                          ? "bg-blue-50/60"
                          : "bg-green-50"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-sm leading-tight">🗓️</span>

                        <span
                          className={`min-w-0 truncate font-medium leading-tight ${
                            isDone(t)
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>

                        {/* Weekly: show subtask progress badge on parent rows */}
                        {progressBadge(t)}
                        {recurrenceBadge(t)}

                        {t.__collapsed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
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
              <div className="px-4 py-3 text-sm text-gray-500">
                No meetings this week.
              </div>
            )}
        </div>
      )} />
      </div>

      {/* WORK */}
      <div className="lg:col-span-6">
      <SectionPanel title="WORK" right={`${workToRender.length} total`} children={(
        <div className={`${sectionMaxHeightClass(workToRender.length)} overflow-auto rounded-lg border bg-blue-50/40`}>
          <table className="w-full text-sm table-fixed">
            <thead className="text-[11px] text-gray-600">
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left uppercase tracking-wide">
                  Task
                </th>
              </tr>
            </thead>

            <tbody>
              {workToRender.map((t: AnyTask) => (
                <tr
                  key={t.id}
                  className={`font-medium border-b last:border-b-0 transition-colors duration-150 hover:bg-white ${
                    isDone(t) ? "bg-green-50" : ""
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={`font-medium truncate leading-tight ${
                          isDone(t)
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </div>

                      {/* Weekly: show subtask progress badge on parent rows */}
                      {progressBadge(t)}
                      {recurrenceBadge(t)}

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount ?? 1}x)
                        </span>
                      ) : null}
                    </div>
                  </td>

                </tr>
              ))}

              {!workToRender.length && (
                <tr>
                  <td colSpan={1} className="px-4 py-3 text-sm text-gray-500">
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
      <div className="lg:col-span-3">
      <SectionPanel title="NOTES" right="Ongoing" children={(
        <div className={`${sectionMaxHeightClass(notes.length)} overflow-auto rounded-lg border bg-blue-50/40`}>
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
            <div className="px-4 py-3 text-sm text-gray-500">No notes.</div>
          )}
        </div>
      )} />
      </div>
    </div>
  );
}
