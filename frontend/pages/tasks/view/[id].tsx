import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import Spinner from 'components/shared/Spinner';
import EmptyStateCard from 'components/shared/EmptyStateCard';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownBody from 'components/shared/MarkdownBody';

const TaskShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, deleteTask, isLoading } = useTasks();

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
          { label: 'All Tasks', onClick: () => router.push('/tasks'), variant: 'primary' },
        ]}
      />
    );
  }

  const handleEdit = () => {
    router.push(`/tasks/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this occurence?\n If this is a recurring event, all past and future occurences will be deleted as well")) return;

    try {
      await deleteTask(task);
      await router.push('/tasks');
    } catch (err) {
      alert('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href="/tasks" className="text-sm text-gray-600 hover:text-blue-600">
          ← All Tasks
        </a>

        <div className="flex items-center gap-2">
          {/* replace with your Button later */}
          <a
            onClick={() => handleEdit()}
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </a>
          <button
            onClick={() => handleDelete()}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {task.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5">
                {task.is_done ? "Done" : "Open"}
              </span>
              <span>•</span>
              <span className="capitalize">{task.category}</span>
              <span>•</span>
              <span className="capitalize">{task.priority}</span>
              {task.project ? (
                <>
                  <span>•</span>
                  <span>{task.project}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Optional: quick status toggle later */}
        </div>
      </div>

      {/* Content + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Markdown description */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
            <span className="text-xs text-gray-500">
              Task #{task.id}
            </span>
          </div>

          <MarkdownBody value={task.description} emptyText="No notes yet." />
        </div>

        {/* Details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{task.is_done ? "Done" : "Open"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Carry Over</dt>
              <dd className="text-gray-900">{task.carry_over ? "Yes" : "No"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Subtask</dt>
              <dd className="text-gray-900">{task.is_subtask ? "Yes" : "No"}</dd>
            </div>

            {/* Add your dates if available */}
            {task.begin_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Begin</dt>
                <dd className="text-gray-900">{task.begin_date}</dd>
              </div>
            ) : null}

            {task.end_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">End</dt>
                <dd className="text-gray-900">{task.end_date}</dd>
              </div>
            ) : null}

            {/* Keep IDs de-emphasized if you must show them */}
            {task.user ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">User</dt>
                <dd className="text-gray-900">{task.user}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default TaskShowPage;