import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';

const TasksPage = () => {
  const { tasks } = useTasks();
  const router = useRouter();

  return (
    <div>
      <h1>Tasks</h1>
      {tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      )}
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default TasksPage;