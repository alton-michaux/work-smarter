import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';

const TasksPage = () => {
  const { tasks, deleteTask } = useTasks(); // Use deleteTask from context
  const router = useRouter();

  const handleTaskClick = (id: number) => {
    router.push(`/tasks/view/${id}`);
  };

  const handleEdit = (id: number) => {
    router.push(`/tasks/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id); // Call backend via context
    }
  };

  return (
    <div>
      <h1>Tasks</h1>
      <button onClick={() => router.push('/tasks/create')}>Create New Task</button>
      {tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {[...tasks]
            .sort((a, b) => a.id - b.id)
            .map((task) => (
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
                <button onClick={() => handleEdit(task.id)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => handleDelete(task.id)} style={{ color: 'red' }}>Delete</button>
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