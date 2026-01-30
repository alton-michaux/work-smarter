import { useEffect, useCallback } from 'react';
import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { DateToggleUI } from 'components/ui/dateToggleUI';
import { TaskLayout } from 'components/tasks/TaskLayout';
import { useDailyLog } from '../../hooks/useDailyLog';

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    isLoading,
    error,
    resetAndFetch,
  } = useTasks();
  const router = useRouter();
  const queryDate = typeof router.query.date === 'string' ? router.query.date : null;

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

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Daily Log</h1>

        {/* Day toggler */}
        {<DateToggleUI selectedDate={selectedDate} setSelectedDate={setSelectedDate} last7Days={last7Days} />}

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

        {/* Empty / Loading / Content state */}
        {!selectedDate ? (
          <p className="text-gray-600 text-center">Loading…</p>
        ) : (!isLoading && dailyTasks.length === 0 ? (
          <p className="text-gray-600 text-center">No entries for {selectedDate}.</p>
        ) : (
          <TaskLayout
            sections={sections}
            onView={handleTaskClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}

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
