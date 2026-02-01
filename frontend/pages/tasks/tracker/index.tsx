import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../utils/dateUtils';
import WeekSelector from '../../../components/ui/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';
import Spinner from 'components/shared/Spinner';

export default function TaskTrackerPage() {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const { tasks, fetchTasksByDateRange, toggleTaskDone, isLoading } = useTasks(); // Add isLoading
  const router = useRouter();

  // Set current Monday only on the client
  useEffect(() => {
    setSelectedWeek(getCurrentMonday());
  }, []);

  // Fetch tasks once selectedWeek is ready - using useRef to avoid using fetchTasksByDateRange as dep
  const doFetch = useRef<((b: string, e: string, a: string) => Promise<void>) | null>(null);
  useEffect(() => { doFetch.current = fetchTasksByDateRange; }, [fetchTasksByDateRange]);

  const lastRangeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedWeek) return;
    const end = getEndOfWeek(selectedWeek);
    const key = `${selectedWeek}__${end}`;
    if (lastRangeRef.current === key) return;
    lastRangeRef.current = key;
    fetchTasksByDateRange(selectedWeek, end, null);
  }, [selectedWeek, fetchTasksByDateRange]);

  // useEffect(() => {
  //   if (!selectedWeek) return;
  //   const end = getEndOfWeek(selectedWeek);
  //   doFetch.current?.(selectedWeek, end);
  // }, [selectedWeek]); // ← depends only on selectedWeek

  // Don't render until selectedWeek is set (avoids hydration mismatch)
  if (!selectedWeek) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Weekly Task Tracker
        </h1>

        <WeekSelector
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <TaskTable
              tasks={tasks}
              toggleTaskDone={(task) => toggleTaskDone(task.id, task.is_done)}
            />
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push('/tasks')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            ← Back to Tasks
          </button>
        </div>
      </div>
    </div>
  );
}
