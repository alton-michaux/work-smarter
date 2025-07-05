import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';

const TasksPage = () => {
  const { tasks } = useTasks();
  const router = useRouter();

  const handleTaskClick = (id: number) => {
    router.push(`/tasks/view/${id}`);
  };

  return (
    <div>
      <h1>Tasks</h1>
      {tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <strong>
                <a
                  href="#"
                  style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                  onClick={e => {
                    e.preventDefault();
                    handleTaskClick(task.id);
                  }}
                >
                  {task.title}
                </a>
              </strong>
              <br />
              <strong>Category:</strong> {task.category} <br />
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default TasksPage;