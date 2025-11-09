import { FixedSizeList as List } from 'react-window';
import { useEffect, useMemo, useCallback } from 'react';
import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

const ROW_HEIGHT = 88; // adjust if your rows are taller/shorter
const LIST_HEIGHT = 600;

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    isLoading,
    error,
    nextUrl,
    resetAndFetch,
    loadMore,
  } = useTasks();
  const router = useRouter();

  // Initial load — align with backend CursorPagination.ordering
  const { loggedIn } = useAuth();

  useEffect(() => {
    if (loggedIn) {
      resetAndFetch({ ordering: '-begin_date' });
    }
    // Only run when auth state flips
  }, [loggedIn, resetAndFetch]);

  const handleTaskClick = useCallback((id: number) => {
    router.push(`/tasks/view/${id}`);
  }, [router]);

  const handleEdit = useCallback((id: number) => {
    router.push(`/tasks/edit/${id}`);
  }, [router]);

  const handleDelete = useCallback(async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      // No need to manually refetch here; your context’s deleteTask already refreshes
    }
  }, [deleteTask]);

  // Row renderer for react-window
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index];
    return (
      <li style={style} className="border-b px-4 py-4 flex justify-between items-start">
        <div className="min-w-0">
          <button
            onClick={(e) => { e.preventDefault(); handleTaskClick(task.id); }}
            className="text-lg font-semibold text-blue-600 hover:underline text-left truncate"
            title={task.title}
          >
            {task.title}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Category:</span> {task.category ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(task.priority ?? '').toUpperCase()} • {task.begin_date ?? '—'}
          </p>
        </div>

        <div className="flex-shrink-0 flex space-x-3">
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
    );
  };

  // Memoize counts to avoid unnecessary renders
  const itemCount = useMemo(() => tasks.length, [tasks.length]);

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

        {/* Errors */}
        {error && (
          <div className="mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && tasks.length === 0 ? (
          <p className="text-gray-600 text-center">No tasks found.</p>
        ) : (
          <>
            {/* Virtualized list */}
            <List
              height={LIST_HEIGHT}
              width="100%"
              itemCount={itemCount}
              itemSize={ROW_HEIGHT}
              outerElementType="ul"
              className="space-y-0"
            >
              {Row}
            </List>

            {nextUrl && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-4 py-2 rounded border hover:bg-gray-50"
                >
                  {isLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
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
