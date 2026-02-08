import { useEffect, useCallback } from 'react';
import { useTasks } from 'context/TasksContext';
import { useProjects } from 'context/ProjectsContext';
import { useRouter } from 'next/router';
import { DateToggleUI } from 'components/ui/dateToggleUI';
import { TaskLayout } from 'components/tasks/TaskLayout';
import { useDailyLog } from '../../hooks/useDailyLog';
import QuickAddBar from '../../components/tasks/quickAddBar';

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    isLoading,
    error,
    fetchTasksByDateRange,
    toggleTaskDone,
  } = useTasks();

  const router = useRouter();
  const queryDate =
    typeof router.query.date === 'string' ? router.query.date : null;

  const { projects, setProjects } = useProjects();

  const handleTaskClick = useCallback(
    (id: number) => router.push(`/tasks/view/${id}`),
    [router]
  );

  const handleEdit = useCallback(
    (id: number) => router.push(`/tasks/edit/${id}`),
    [router]
  );

  const handleToggleDone = useCallback(
    async (id: number, isDone: boolean) => {
      const task = tasks.find((t: any) => Number(t.id) === Number(id));
      if (!task) return;

      try {
        await toggleTaskDone(id, isDone);
      } catch {
        alert('Failed to update task. Please try again.');
      }
    },
    [tasks, toggleTaskDone]
  );

  const handleDelete = useCallback(
    async (task: any) => {
      if (confirm('Are you sure you want to delete this task?')) {
        await deleteTask(task);
      }
    },
    [deleteTask]
  );

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate, { activeOn: true });

  useEffect(() => {
    if (!selectedDate) return;
    fetchTasksByDateRange(selectedDate, selectedDate, selectedDate);
    setProjects(projects);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center px-4">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow">

        {/* ───────────────── Sticky Header ───────────────── */}
        <div className="sticky top-0 z-20 bg-white border-b">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-800 text-center mb-3">
              Daily Log
            </h1>

            {selectedDate && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* LEFT: showing + weekday buttons */}
                <div className="lg:col-span-8">
                  <div className="text-sm text-gray-600 mb-1">
                    Showing:{' '}
                    <span className="font-medium text-gray-800">{selectedDate}</span>
                  </div>

                  <div className="pt-12">
                    <DateToggleUI
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      last7Days={last7Days}
                      compact
                    />
                  </div>
                </div>

                {/* RIGHT: date picker + quick add */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <div className="flex justify-end">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>

                  <QuickAddBar selectedDate={selectedDate} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-[120px]" />
        {/* ───────────────── Scrollable Content ───────────────── */}
        <div className="px-6 py-6">
          {/* Errors */}
          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}

          {/* Empty / Loading / Content */}
          {!selectedDate ? (
            <p className="text-gray-600 text-center">Loading…</p>
          ) : !isLoading && dailyTasks.length === 0 ? (
            <p className="text-gray-600 text-center">
              No entries for {selectedDate}.
            </p>
          ) : (
            <TaskLayout
              sections={sections}
              onView={handleTaskClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleDone={handleToggleDone}
            />
          )}

          {/* Bottom Navigation */}
          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => router.push('/tasks/tracker')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              View Weekly Tracker
            </button>

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