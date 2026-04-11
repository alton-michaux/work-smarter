import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../lib/dateUtils';
import WeekSelector from '../../../components/ui/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';
import Spinner from 'components/shared/Spinner';
import { collapseRecurringTasks } from "../../../lib/collapseDailyRecurring";
import { buildSubtaskProgressByParentId } from "lib/subtaskProgress";
import { categoryToType, priorityRank } from "../../../lib/dailyLog";

export default function TaskTrackerPage() {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const { tasks, fetchTasksByDateRange, isLoading } = useTasks(); // Add isLoading
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

  const meetings = useMemo(() => {
    return (tasks ?? [])
      .filter((t: any) => categoryToType(t.category) === 'meeting')
      .sort((a: any, b: any) => String(a.begin_date ?? '').localeCompare(String(b.begin_date ?? '')));
  }, [tasks]);

  const work = useMemo(() => {
    return (tasks ?? [])
      .filter((t: any) => categoryToType(t.category) === 'task')
      .sort((a: any, b: any) => {
        const pd = priorityRank(a.priority) - priorityRank(b.priority);
        if (pd !== 0) return pd;
        return String(b.begin_date ?? '').localeCompare(String(a.begin_date ?? ''));
      });
  }, [tasks]);

  const collapsedMeetings = useMemo(
    () => collapseRecurringTasks(meetings, { frequency: "daily" }),
    [meetings]
  );

  const collapsedWork = useMemo(
    () => collapseRecurringTasks(work, { frequency: "daily" }),
    [work]
  );

  const notes = useMemo(
    () => tasks
      .filter((t: any) => categoryToType(t.category) === 'note')
      .sort((a: any, b: any) => priorityRank(a.priority) - priorityRank(b.priority)),
    [tasks]
  );

  const progressByParentId = useMemo(
    () => buildSubtaskProgressByParentId(tasks),
    [tasks]
  );

  const weekSummary = useMemo(() => {
    const all = [...collapsedWork, ...collapsedMeetings];
    const done = all.filter((t: any) => t.effective_is_done ?? t.is_done).length;
    return { done, remaining: all.length - done };
  }, [collapsedWork, collapsedMeetings]);

  // Don't render until selectedWeek is set (avoids hydration mismatch)
  if (!selectedWeek) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white border-b">
          <div className="p-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">
                Weekly Task Tracker
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/tasks')}
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  type="button"
                >
                  Daily Log
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  type="button"
                >
                  Dashboard
                </button>
              </div>
            </div>

            <WeekSelector
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />

            {!isLoading && (
              <div className="mt-3 flex justify-center gap-4 text-sm text-gray-500">
                <span className="text-green-600 font-medium">{weekSummary.done} done</span>
                <span>·</span>
                <span>{weekSummary.remaining} remaining</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-8 pb-8">
          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <TaskTable
                tasks={tasks}
                meetings={collapsedMeetings as any}
                work={collapsedWork as any}
                notes={notes}
                subtaskProgressByParentId={progressByParentId}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
