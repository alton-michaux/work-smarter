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
    <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Tasks</h1>

        {/* Create New Task */}
        <div className="mb-6 text-center">
          <button
            onClick={() => router.push('/tasks/create')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            + Create New Task
          </button>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <p className="text-gray-600 text-center">No tasks found.</p>
        ) : (
          <ul className="space-y-6">
            {[...tasks]
              .sort((a, b) => a.id - b.id)
              .map((task: any) => (
                <li
                  key={task.id}
                  className="border-b pb-4 flex justify-between items-start"
                >
                  <div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleTaskClick(task.id);
                      }}
                      className="text-lg font-semibold text-blue-600 hover:underline text-left"
                    >
                      {task.title}
                    </button>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Category:</span> {task.category}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(task.id)}
                      className="text-sm text-yellow-600 hover:text-yellow-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}

        {/* Bottom Navigation */}
        <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => router.push('/tasks/tracker')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            View Weekly Tracker
          </button>

          <div className="flex space-x-4">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:underline"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;