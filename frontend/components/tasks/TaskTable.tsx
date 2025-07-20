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
    <table>
      <thead>
        <tr>
          <th>Done</th>
          <th>Title</th>
          <th>Date</th>
          <th>Category</th>
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => toggleTaskDone(task)}
              />
            </td>
            <td>{task.title}</td>
            <td>{task.begin_date}</td>
            <td>{task.category}</td>
            <td>{task.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
