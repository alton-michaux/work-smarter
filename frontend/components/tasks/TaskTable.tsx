import { Task } from "types/types";

type Props = {
  tasks: Task[];
  toggleTaskDone: (task: Task) => void;
  meetings: [];
  work: [];
};

export default function TaskTable({ tasks, toggleTaskDone, meetings, work }: Props) {
  return (
    <>
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-gray-500">MEETINGS</h2>
          <div className="text-xs text-gray-400">{meetings.length} total</div>
        </div>

        <div className="rounded-lg border bg-blue-50/40">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr className="border-b">
                <th className="p-3 text-left w-10">Done</th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left w-32">Date</th>
                <th className="p-3 text-left w-28">Priority</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((t: any) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="p-3">
                    <input type="checkbox" checked={!!t.is_done} readOnly />
                  </td>
                  <td className="p-3 font-medium text-gray-900">
                    <span className="mr-2">🗓️</span>{t.title}
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
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left w-10">Done</th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left w-32">Date</th>
                <th className="p-3 text-left w-36">Category</th>
                <th className="p-3 text-left w-28">Priority</th>
              </tr>
            </thead>

            <tbody>
              {work.map((t: any) => (
                <tr key={t.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="p-3">
                    <input type="checkbox" checked={!!t.is_done} readOnly />
                  </td>

                  <td className="p-3 font-medium text-gray-900">
                    {t.title}
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
