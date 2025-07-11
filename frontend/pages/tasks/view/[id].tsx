import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';

const TaskShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, setTasks } = useTasks();

  // Find the task by id (id from router.query is a string)
  const task = tasks.find(t => t.id === Number(id));

  if (!task) {
    return (
      <div>
        <h1>Task Not Found</h1>
        <button onClick={() => router.back()}>Back</button>
        <button onClick={() => router.push('/tasks')}>All Tasks</button>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/tasks/edit/${id}`);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t.id !== Number(id)));
      router.push('/tasks');
    }
  };

  return (
    <div>
      <h1>Task Details</h1>
      <ul>
        <li><strong>ID:</strong> {task.id}</li>
        <li><strong>Title:</strong> {task.title}</li>
        <li><strong>Category:</strong> {task.category}</li>
        <li><strong>Done:</strong> {task.is_done ? 'Yes' : 'No'}</li>
        <li><strong>Priority:</strong> {task.priority}</li>
        <li><strong>Description:</strong> {task.description}</li>
        <li><strong>Is Subtask:</strong> {task.is_subtask ? 'Yes' : 'No'}</li>
        <li><strong>Carry Over:</strong> {task.carry_over ? 'Yes' : 'No'}</li>
        <li><strong>User:</strong> {task.user}</li>
        <li><strong>Project:</strong> {task.project}</li>
      </ul>
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/tasks')}>All Tasks</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default TaskShowPage;