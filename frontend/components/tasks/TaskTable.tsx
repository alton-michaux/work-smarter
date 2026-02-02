import { Task } from "types/types";

type Props = {
  tasks: Task[];
  meetings: Task[];
  work: Task[];
};

export default function TaskTable({ tasks, meetings, work }: Props) {
  return (
    <>
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">MEETINGS</h2>
          <div className="text-xs text-gray-400">{meetings.length} total</div>
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
              {meetings.map((t: any) => (
                <tr key={t.id} className={`font-medium ${
                        t.is_done
                          ? 'border-b last:border-b-0 hover:bg-gray-50 bg-green-50'
                          : 'border-b last:border-b-0 hover:bg-gray-50'
                      }`}
                      >
                  <td className="p-3">
                    <span className="mr-2">🗓️</span>
                    <span
                      className={`font-medium ${
                        t.is_done
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {t.title}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{String(t.begin_date ?? '').slice(0, 10)}</td>
                  <td className="p-3 text-gray-600">{t.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!meetings.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No meetings this week.</div>
          )}
        </div>
      </section>
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">WORK</h2>
          <div className="text-xs text-gray-400">{work.length} total</div>
        </div>

        <div className="rounded-lg border bg-white">
          <table className="w-full text-sm table-fixed">
            <thead className="text-xs text-gray-600">
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left w-32">Date</th>
                <th className="p-3 text-left w-36">Category</th>
                <th className="p-3 text-left w-28">Priority</th>
              </tr>
            </thead>

            <tbody>
              {work.map((t: any) => (
                <tr key={t.id} className={`font-medium ${
                        t.is_done
                          ? 'border-b last:border-b-0 hover:bg-gray-50 bg-green-50'
                          : 'border-b last:border-b-0 hover:bg-gray-50'
                      }`}
                      >
                  <td className="p-3">
                    <span
                      className={`font-medium ${
                        t.is_done
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {t.title}
                    </span>
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

          {!work.length && (
            <div className="px-4 py-3 text-sm text-gray-500">No work items this week.</div>
          )}
        </div>
      </section>
    </>
  );
}
