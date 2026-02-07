import NoteCard from "components/notes/NoteCard";
import { AnyTask, TrackerProps } from "types/types";
import { SectionPanel } from "components/ui/trackerSection";

export default function TaskTable({
  tasks,
  meetings,
  work,
  collapsedMeetings,
  collapsedWork,
  notes,
}: TrackerProps) {
  /**
   * Determines if a task is marked as done.
   * @param t - The task object to check
   * @returns True if the task's effective_is_done or is_done property is truthy, false otherwise
   */
  const isDone = (t: any) => Boolean(t.effective_is_done ?? t.is_done);
  const isAutoDoneMeeting = (t: any) => t.effective_is_done && !t.is_done;

  // ✅ Use collapsed arrays if provided; otherwise use original arrays
  const meetingsToRender = (collapsedMeetings ?? meetings) as AnyTask[];
  const workToRender = (collapsedWork ?? work) as AnyTask[];

  const dateLabel = (t: any) => String(t.begin_date ?? "").slice(0, 10);

  return (
    <>
      {/* MEETINGS */}
      <SectionPanel title="MEETINGS" right={`${meetingsToRender.length} total`}>
        <div className="h-56 overflow-y-auto overflow-auto">
          <div className="rounded-lg border bg-blue-50/40">
            <table className="w-full text-sm table-fixed">
              <thead className="text-[11px] text-gray-600">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left w-32">Date</th>
                  <th className="px-3 py-2 text-left w-28">Priority</th>
                </tr>
              </thead>

              <tbody>
                {meetingsToRender.map((t: AnyTask) => (
                  <tr
                    key={t.id}
                    className={`border-b last:border-b-0 hover:bg-white/60 ${
                      isDone(t)
                        ? isAutoDoneMeeting(t)
                          ? "bg-blue-50/60"
                          : "bg-green-50"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-base leading-none">🗓️</span>

                        <span
                          className={`min-w-0 truncate font-medium ${
                            isDone(t) ? "text-gray-500 line-through" : "text-gray-900"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>

                        {t.__collapsed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                            Daily ↻ ({t.__occurrenceCount ?? 1}x)
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-gray-600">{dateLabel(t)}</td>
                    <td className="px-3 py-2 text-gray-600">{(t as any).priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!meetingsToRender.length && (
              <div className="px-4 py-3 text-sm text-gray-500">No meetings this week.</div>
            )}
          </div>
        </div>
      </SectionPanel>

      {/* WORK */}
      <SectionPanel title="WORK" right={`${workToRender.length} total`}>
          <div className="h-64 overflow-y-auto rounded-lg border bg-blue-50/40">
            <table className="w-full text-sm table-fixed">
              <thead className="text-[11px] text-gray-600">
                <tr className="border-b">
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left w-32">Date</th>
                <th className="px-3 py-2 text-left w-36">Category</th>
                <th className="px-3 py-2 text-left w-28">Priority</th>
              </tr>
            </thead>

            <tbody>
              {workToRender.map((t: AnyTask) => (
                <tr
                  key={t.id}
                  className={`font-medium border-b last:border-b-0 hover:bg-gray-50 ${
                    isDone(t) ? "bg-green-50" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={`font-medium truncate ${
                          isDone(t) ? "text-gray-500 line-through" : "text-gray-900"
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </div>

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount ?? 1}x)
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="p-3 text-gray-600">{dateLabel(t)}</td>
                  <td className="p-3 text-gray-600">{(t as any).category ?? "—"}</td>
                  <td className="p-3 text-gray-600">{(t as any).priority ?? "—"}</td>
                </tr>
              ))}

              {!workToRender.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm text-gray-500">
                    No work items this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionPanel>
      
      {/* NOTES */}
      <SectionPanel title="NOTES" right="Ongoing">        
        <div className="h-40 overflow-y-auto rounded-lg bg-blue-50/40">
          {notes.length ? (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <NoteCard key={n.id} note={n} variant="dashed" showMeta={false} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 rounded-lg border bg-blue-50/40">No notes this week.</div>
          )}
        </div>
      </SectionPanel>
    </>
  );
}
