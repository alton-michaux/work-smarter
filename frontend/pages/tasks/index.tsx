import { useEffect, useCallback } from 'react';
import { useTasks } from 'context/TasksContext';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { DateToggleUI } from 'components/ui/dateToggleUI';
import { TaskLayout } from 'components/tasks/TaskLayout';
import { useDailyLog } from '../../hooks/useDailyLog';
import QuickAddBar from '../../components/tasks/quickAddBar';

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    updateTask,
    isLoading,
    error,
    resetAndFetch,
    fetchTasksByDateRange
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

  const handleToggleDone = useCallback(
    async (id: number, isDone: boolean) => {
      const task = tasks.find((t: any) => Number(t.id) === Number(id));
      if (!task) {
        console.warn('handleToggleDone: task not found for id', id);
        return;
      }

      try {
        await updateTask({
          ...task,
          is_done: isDone,
        });
      } catch (e) {
        alert('Failed to update task. Please try again.');
      }
    },
    [tasks, updateTask]
  );

  const handleDelete = useCallback(async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      // No need to manually refetch here; your context’s deleteTask already refreshes
    }
  }, [deleteTask]);

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate, { activeOn: true });

    
  useEffect(() => {
    if (!selectedDate) return;
    fetchTasksByDateRange(selectedDate, selectedDate, selectedDate);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Daily Log</h1>

        {/* Day toggler */}
        {<DateToggleUI selectedDate={selectedDate} setSelectedDate={setSelectedDate} last7Days={last7Days} />}

        <QuickAddBar selectedDate={selectedDate} />

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
            onToggleDone={handleToggleDone}
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
