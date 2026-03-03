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
  
  const isRecurring = (t: any) => Boolean(t?.recurring_task_id || t?.recurring_task?.id);

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

  async function handleDelete(task: any) {
    const id = typeof task === "number" ? task : task?.id;
    if (!id) throw new Error("Missing task id");

    if (isRecurring(task)) {
      const choice = window.prompt(
        'Type "1" to delete this occurrence, or "2" to delete the entire series.'
      );

      if (choice === "2") {
        await deleteTask(id, { deleteSeries: true });
        return;
      }

      if (choice === "1") {
        await deleteTask(id, { deleteSeries: false });
        return;
      }

      // cancel / invalid input
      return;
    }

    await deleteTask(id);
  }

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate, { activeOn: true });

  useEffect(() => {
    if (!selectedDate) return;
    fetchTasksByDateRange(selectedDate, selectedDate, selectedDate);
    setProjects(projects);
  }, [selectedDate]); // keeping your existing behavior

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Keep overflow visible so sticky works reliably */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* ───────────────── Sticky Header ───────────────── */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm isolate">
            <div className="px-6 py-4">
              {/* Title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-gray-900">
                    Daily Log
                  </h1>
                  {selectedDate && (
                    <p className="mt-1 text-sm text-gray-600">
                      Showing{' '}
                      <span className="font-medium text-gray-900">
                        {selectedDate}
                      </span>
                    </p>
                  )}
                </div>

                {/* Date picker */}
                {selectedDate && (
                  <div className="shrink-0">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-[160px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                )}
              </div>

              {/* Controls row */}
              {selectedDate && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Weekday toggle */}
                  <div className="lg:col-span-7">
                    <DateToggleUI
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      last7Days={last7Days}
                      compact
                    />
                  </div>

                  {/* Quick add */}
                  <div className="lg:col-span-5">
                    <QuickAddBar selectedDate={selectedDate} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ───────────────── Content ───────────────── */}
          {/* This creates breathing room under the sticky header without hacks */}
          <div className="px-6 py-6 pt-10">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {!selectedDate ? (
              <p className="text-gray-600 text-center">Loading…</p>
            ) : !isLoading && dailyTasks.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                <p className="text-sm text-gray-700">
                  No entries for{' '}
                  <span className="font-medium">{selectedDate}</span>.
                </p>
              </div>
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
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                View Weekly Tracker
              </button>

              <button
                onClick={() => router.back()}
                className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;