import { useEffect, useCallback, useState } from 'react';
import { useTasks } from 'context/TasksContext';
import { useAuth } from 'context/AuthContext';
import { useProjects } from 'context/ProjectsContext';
import { useRouter } from 'next/router';
import type { TaskNode } from 'types/types';
import { DateToggleUI } from 'components/ui/dateToggleUI';
import { TaskLayout } from 'components/tasks/TaskLayout';
import { useDailyLog } from '../../hooks/useDailyLog';
import QuickAddBar from '../../components/tasks/quickAddBar';
import SearchBar from '../../components/tasks/SearchBar';
import SearchResults from '../../components/tasks/SearchResults';
import ConfirmDeleteRecurringModal from 'components/ui/confirmDeleteRecurringModal';
import Spinner from 'components/shared/Spinner';
import { toast } from 'sonner';

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    error,
    fetchTasksByDateRange,
    toggleTaskDone,
    searchResults,
    isSearching,
    fetchTasksBySearch,
  } = useTasks();

  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // The date whose fetch has finished. `tasks` is shared with other pages, so
  // until this matches selectedDate it may hold another view's data.
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  const { loggedIn } = useAuth();

  const router = useRouter();
  const queryDate =
    typeof router.query.date === 'string' ? router.query.date : null;
  
  const isRecurring = (t: TaskNode) => Boolean(t?.recurring_task_id);

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
      const task = tasks.find((t) => Number(t.id) === Number(id));
      if (!task) return;

      try {
        await toggleTaskDone(id, isDone);
      } catch {
        toast.error('Failed to update task. Please try again.');
      }
    },
    [tasks, toggleTaskDone]
  );

  const handleDelete = async (task: TaskNode) => {
    if (isRecurring(task)) {
      setTaskPendingDelete(task);
      setDeleteModalOpen(true);
      return;
    }

    await deleteTask(task);
  };

  const { selectedDate, setSelectedDate, last7Days, dailyTasks, sections } =
    useDailyLog(tasks, queryDate, { activeOn: true, ready: router.isReady });

  // Keep the date in the URL so returning to the daily log (e.g. back from a
  // task) restores the same day. replace, not push: flipping between days
  // shouldn't add history entries the back button has to step through.
  const selectDate = useCallback(
    (date: string) => {
      if (!date) return;
      setSelectedDate(date);
      router.replace(
        { pathname: router.pathname, query: { ...router.query, date } },
        undefined,
        { shallow: true }
      );
    },
    [router, setSelectedDate]
  );

  const isSearchMode = Boolean(debouncedQuery.trim());

  // Depends on loggedIn/fetchTasksByDateRange too: on a fresh page load (e.g.
  // browser back after a full reload) auth resolves after the date is set, and
  // a fetch attempted before then is a no-op that would otherwise never retry.
  useEffect(() => {
    if (!selectedDate || !loggedIn) return;
    let cancelled = false;
    fetchTasksByDateRange(selectedDate, selectedDate, selectedDate).finally(() => {
      if (!cancelled) setLoadedDate(selectedDate);
    });
    setProjects(projects);
    return () => {
      cancelled = true;
    };
  }, [selectedDate, loggedIn, fetchTasksByDateRange]);

  // Re-fetch every 2 minutes when viewing today so meeting done-state stays current
  useEffect(() => {
    if (!selectedDate || !loggedIn) return;
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate !== today) return;
    const interval = setInterval(() => {
      fetchTasksByDateRange(selectedDate, selectedDate, selectedDate);
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate, loggedIn, fetchTasksByDateRange]);

  const isDayLoaded = Boolean(selectedDate) && loadedDate === selectedDate;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      fetchTasksBySearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  // Matches the nav buttons on the sibling tracker/timeline views
  const navBtnClass =
    'rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition';

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 px-4 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl h-full">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm h-full flex flex-col overflow-hidden">
          {/* ───────────────── Sticky Header ───────────────── */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm isolate">
            <div className="px-6 py-3">
              {/* Title row */}
              <div className="flex items-center justify-between gap-4">
                <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Daily Log
                  {selectedDate && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      · {selectedDate}
                    </span>
                  )}
                </h1>

                <div className="shrink-0 flex items-center gap-2">
                  <button onClick={() => router.push('/tasks/tracker')} className={navBtnClass}>
                    Weekly Tracker
                  </button>
                  <button onClick={() => router.push('/tasks/timeline')} className={navBtnClass}>
                    Timeline
                  </button>
                  <button onClick={() => router.push('/notes')} className={navBtnClass}>
                    Notes
                  </button>
                  <button onClick={() => router.push('/dashboard')} className={navBtnClass}>
                    Dashboard
                  </button>
                </div>
              </div>

              {/* Controls */}
              {selectedDate && (
                <>
                  {/* Row 1: day pills + date picker + search */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <DateToggleUI
                      selectedDate={selectedDate}
                      setSelectedDate={selectDate}
                      last7Days={last7Days}
                      compact
                    />

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => selectDate(e.target.value)}
                      className="shrink-0 w-[150px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />

                    <div className="flex-1 min-w-[220px]">
                      <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        isSearching={isSearching}
                        onClear={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                      />
                    </div>
                  </div>

                  {/* Row 2: quick add */}
                  <div className="mt-2">
                    <QuickAddBar selectedDate={selectedDate} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ───────────────── Content ───────────────── */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-6 pt-4 pb-4">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {isSearchMode ? (
              <SearchResults
                results={searchResults}
                query={debouncedQuery}
                isSearching={isSearching}
                onView={handleTaskClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleDone={handleToggleDone}
              />
            ) : !isDayLoaded ? (
              <Spinner />
            ) : dailyTasks.length === 0 ? (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-8 text-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  No entries for{' '}
                  <span className="font-medium">{selectedDate}</span>.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
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

        </div>
      </div>
    </div>
  );
};

export default TasksPage;