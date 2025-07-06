import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import TaskForm from '../../../components/tasks/TaskForm';

export default function TaskEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, updateTask } = useTasks();

  const task = tasks.find(t => t.id === Number(id));
  if (!task) return <div>Task not found</div>;

  const handleUpdate = (updatedTask) => {
    updateTask({ ...updatedTask, id: Number(id) });
    router.push(`/tasks/view/${id}`);
  };

  return (
    <div>
      <h1>Edit Task</h1>
      <TaskForm initialTask={task} onSubmit={handleUpdate} submitLabel="Update" />
      <button onClick={() => router.push(`/tasks/view/${id}`)} style={{ marginTop: 12 }}>Cancel</button>
    </div>
  );
}