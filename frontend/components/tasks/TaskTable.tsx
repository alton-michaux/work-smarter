import { Task } from "types/types";

type Props = {
  collapsedMeetings: Task[];
  collapsedWork: Task[];
};

export default function TaskTable({ collapsedMeetings, collapsedWork }: Props) {
  /**
   * Determines if a task is marked as done.
   * @param t - The task object to check
   * @returns True if the task's effective_is_done or is_done property is truthy, false otherwise
   */
  const isDone = (t: any) => Boolean(t.effective_is_done ?? t.is_done);
  const isAutoDoneMeeting = (t: any) => t.effective_is_done && !t.is_done;

  return (
    <>
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">MEETINGS</h2>
          <div className="text-xs text-gray-400">{collapsedMeetings.length} total</div>
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
              {collapsedMeetings.map((t: any) => (
                <tr
                  key={t.id}
                  className={`font-medium border-b last:border-b-0 hover:bg-gray-50 ${
                    isDone(t)
                      ? isAutoDoneMeeting(t)
                        ? 'bg-blue-50/60'
                        : 'bg-green-50'
                      : ''
                    }`
                  }
                >
                  <td className="p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="mr-2">🗓️</span>

                      <span
                        className={`font-medium truncate ${isDone(t) ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                        title={t.title}
                      >
                        {t.title}
                      </span>

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount}x)
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{String(t.begin_date ?? '').slice(0, 10)}</td>
                  <td className="p-3 text-gray-600">{t.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!collapsedMeetings.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No meetings this week.</div>
          )}
        </div>
      </section>
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">WORK</h2>
          <div className="text-xs text-gray-400">{collapsedWork.length} total</div>
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
              {collapsedWork.map((t: any) => (
                <tr key={t.id} className={`font-medium ${
                        isDone(t)
                          ? 'border-b last:border-b-0 hover:bg-gray-50 bg-green-50'
                          : 'border-b last:border-b-0 hover:bg-gray-50'
                      }`}
                      >
                  <td className="p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className={`font-medium truncate ${isDone(t) ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                        title={t.title}
                      >
                        {t.title}
                      </span>

                      {t.__collapsed ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          Daily ↻ ({t.__occurrenceCount}x)
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">
                    {String(t.begin_date ?? '').slice(0, 10)}
                  </td>
                  <td className="p-3 text-gray-600">
                    {t.category ?? '—'}
                  </td>
                  <td className="p-3 text-gray-600">
                    {t.priority ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!collapsedWork.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No work items this week.</div>
          )}
        </div>
      </section>
    </>
  );
}
