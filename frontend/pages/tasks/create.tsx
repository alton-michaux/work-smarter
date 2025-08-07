import { useRouter } from 'next/router';
import { useTasks } from '../../context/TasksContext';
import TaskForm from '../../components/tasks/TaskForm';

const emptyTask = {
  title: '',
  category: '',
  priority: '',
  description: '',
  is_done: false,
  is_subtask: false,
  carry_over: false,
  user: '',
  project: '',
};

export default function TaskCreatePage() {
  const router = useRouter();
  const { addTask } = useTasks();

  const handleCreate = (task) => {
    addTask(task);
    router.push('/tasks');
  };

  return (
    <div>
      <h1>Create Task</h1>
      <TaskForm initialTask={emptyTask} onSubmit={handleCreate} submitLabel="Create" />
      <div className="flex space-x-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}