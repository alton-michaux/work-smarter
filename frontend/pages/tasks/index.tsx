import { useEffect, useCallback, useState } from 'react';
import { useTasks } from 'context/TasksContext';
import { useProjects } from 'context/ProjectsContext';
import { useRouter } from 'next/router';
import { DateToggleUI } from 'components/ui/dateToggleUI';
import { TaskLayout } from 'components/tasks/TaskLayout';
import { useDailyLog } from '../../hooks/useDailyLog';
import QuickAddBar from '../../components/tasks/quickAddBar';
import ConfirmDeleteRecurringModal from 'components/ui/confirmDeleteRecurringModal';
import { toast } from 'sonner';

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    isLoading,
    error,
    fetchTasksByDateRange,
    toggleTaskDone,
  } = useTasks();

  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<any>(null);

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
        toast.error('Failed to update task. Please try again.');
      }
    },
    [tasks, toggleTaskDone]
  );

  const handleDelete = async (task: any) => {
    if (isRecurring(task)) {
      setTaskPendingDelete(task);
      setDeleteModalOpen(true);
      return;
    }

    await deleteTask(task);
  };

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate, { activeOn: true });

  useEffect(() => {
    if (!selectedDate) return;
    fetchTasksByDateRange(selectedDate, selectedDate, selectedDate);
    setProjects(projects);
  }, [selectedDate]); // keeping your existing behavior

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 px-4 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl h-full">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm h-full flex flex-col overflow-hidden">
          {/* ───────────────── Sticky Header ───────────────── */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm isolate">
            <div className="px-6 py-4">
              {/* Title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Daily Log
                  </h1>
                  {selectedDate && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Showing{' '}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
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
                      className="w-[160px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
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
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-6 pt-6 pb-6">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {!selectedDate ? (
              <p className="text-gray-600 text-center">Loading…</p>
            ) : !isLoading && dailyTasks.length === 0 ? (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-8 text-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  No entries for{' '}
                  <span className="font-medium">{selectedDate}</span>.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full">
                <TaskLayout
                  sections={sections}
                  onView={handleTaskClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleDone={handleToggleDone}
                />
              </div>
            )}

            <ConfirmDeleteRecurringModal
              open={deleteModalOpen}
              onClose={() => {
                setDeleteModalOpen(false);
                setTaskPendingDelete(null);
              }}
              onDeleteOccurrence={async () => {
                if (!taskPendingDelete) return;
                await deleteTask(taskPendingDelete);
                setDeleteModalOpen(false);
                setTaskPendingDelete(null);
              }}
              onDeleteFuture={async () => {
                if (!taskPendingDelete) return;
                await deleteTask(taskPendingDelete, { deleteFuture: true });
                setDeleteModalOpen(false);
                setTaskPendingDelete(null);
              }}
              onDeleteSeries={async () => {
                if (!taskPendingDelete) return;
                await deleteTask(taskPendingDelete, { deleteSeries: true });
                setDeleteModalOpen(false);
                setTaskPendingDelete(null);
              }}
            />
          </div>

          {/* ───────────────── Bottom Navigation (outside scroll) ───────────────── */}
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/tasks/tracker')}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              View Weekly Tracker
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;