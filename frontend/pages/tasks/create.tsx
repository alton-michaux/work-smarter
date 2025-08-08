import { useRouter } from 'next/router';
import { useTasks } from '../../context/TasksContext';
import TaskForm from '../../components/tasks/TaskForm';
import Spinner from 'components/shared/Spinner';

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
  const { addTask, isLoading } = useTasks(); // Add isLoading

  const handleCreate = async (task) => {
    await addTask(task);
    router.push('/tasks');
  };

  return (
    <div>
      <h1>Create Task</h1>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <TaskForm initialTask={emptyTask} onSubmit={handleCreate} submitLabel="Create" />
      )}
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