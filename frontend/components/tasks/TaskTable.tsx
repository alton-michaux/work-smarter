type Task = {
  id: number;
  title: string;
  begin_date: string;
  end_date: string | null;
  is_done: boolean;
  category: string | null;
  priority: string;
};

type Props = {
  tasks: Task[];
  toggleTaskDone: (task: Task) => void;
};

export default function TaskTable({ tasks, toggleTaskDone }: Props) {
  return (
    <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 text-left text-sm font-medium text-gray-700">
        <tr>
          <th className="px-4 py-2">Done</th>
          <th className="px-4 py-2">Title</th>
          <th className="px-4 py-2">Date</th>
          <th className="px-4 py-2">Category</th>
          <th className="px-4 py-2">Priority</th>
        </tr>
      </thead>
      <tbody className="text-sm divide-y divide-gray-100">
        {tasks.map((task) => (
          <tr
            key={task.id}
            className={task.is_done ? 'bg-green-50 text-gray-500 line-through' : ''}
          >
            <td className="px-4 py-2">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => toggleTaskDone(task)}
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
            </td>
            <td className="px-4 py-2">{task.title}</td>
            <td className="px-4 py-2">{task.begin_date}</td>
            <td className="px-4 py-2">{task.category}</td>
            <td className="px-4 py-2">{task.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
