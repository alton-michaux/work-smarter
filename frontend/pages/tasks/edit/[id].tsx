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
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Task</h1>
      <TaskForm initialTask={task} onSubmit={handleUpdate} submitLabel="Update" />
      <button className="text-gray-500 text-sm hover:underline" onClick={() => router.push(`/tasks/view/${id}`)} style={{ marginTop: 12 }}>Cancel</button>
    </div>
  );
}