import { Task } from "types/types";

type CollapsedMeta = {
  __collapsed?: boolean;
  __occurrenceCount?: number;
  __firstDate?: string | null;
  __lastDate?: string | null;
};

type AnyTask = Task & CollapsedMeta;

type Props = {
  tasks: Task[];     // kept for backwards compatibility even if unused here
  meetings: Task[];
  work: Task[];

  // OPTIONAL: only used by Weekly Tracker (daily log can ignore)
  collapsedMeetings?: Task[];
  collapsedWork?: Task[];
};

export default function TaskTable({
  tasks,
  meetings,
  work,
  collapsedMeetings,
  collapsedWork,
}: Props) {
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
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">MEETINGS</h2>
          <div className="text-xs text-gray-400">{meetingsToRender.length} total</div>
        </div>

        <div className="rounded-lg border bg-blue-50/40">
          <table className="w-full text-sm table-fixed">
            <thead className="text-xs text-gray-600">
              <tr className="border-b">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left w-32">Date</th>
                <th className="p-3 text-left w-28">Priority</th>
              </tr>
            </thead>

            <tbody>
              {meetingsToRender.map((t: AnyTask) => (
                <tr
                  key={t.id}
                  className={`font-medium border-b last:border-b-0 hover:bg-gray-50 ${
                    isDone(t)
                      ? isAutoDoneMeeting(t)
                        ? "bg-blue-50/60"
                        : "bg-green-50"
                      : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="mr-2">🗓️</span>

                      <span
                        className={`font-medium truncate ${
                          isDone(t) ? "text-gray-500 line-through" : "text-gray-900"
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </span>

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount ?? 1}x)
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="p-3 text-gray-600">{dateLabel(t)}</td>
                  <td className="p-3 text-gray-600">{(t as any).priority}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!meetingsToRender.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No meetings this week.</div>
          )}
        </div>
      </section>

      {/* WORK */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">WORK</h2>
          <div className="text-xs text-gray-400">{workToRender.length} total</div>
        </div>

        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm table-fixed">
            <thead className="text-xs text-gray-600">
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Task</th>
                <th className="p-3 text-left w-32">Date</th>
                <th className="p-3 text-left w-36">Category</th>
                <th className="p-3 text-left w-28">Priority</th>
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
            </tbody>
          </table>

          {!workToRender.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No work items this week.</div>
          )}
        </div>
      </section>
    </>
  );
}
