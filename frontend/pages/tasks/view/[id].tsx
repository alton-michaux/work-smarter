import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import Spinner from 'components/shared/Spinner';
import EmptyStateCard from 'components/shared/EmptyStateCard';

const TaskShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, setTasks, deleteTask, isLoading } = useTasks();

  const task = tasks?.find(t => t.id === Number(id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <EmptyStateCard
        title="Task Not Found"
        actions={[
          { label: 'Back', onClick: () => router.back(), variant: 'secondary' },
          { label: 'All Tasks', onClick: () => router.push('/tasks'), variant: 'primary' },
        ]}
      />
    );
  }

  const handleEdit = () => {
    router.push(`/tasks/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(Number(id));
      router.push('/tasks');
    } catch (err) {
      alert('Failed to delete task. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Task Details</h1>
      <ul className="space-y-2 text-gray-700">
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

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Back
        </button>
        <button
          onClick={() => router.push('/tasks')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          All Tasks
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Home
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-green-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default TaskShowPage;