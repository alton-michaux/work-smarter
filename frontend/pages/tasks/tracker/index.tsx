import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../utils/dateUtils';
import WeekSelector from '../../../components/ui/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';
import Spinner from 'components/shared/Spinner';

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

  const isMeeting = (t: any) => {
    const c = String(t.category ?? '').trim().toLowerCase();
    return c === 'meeting' || c === 'meetings';
  };

  const meetings = useMemo(() => {
    return (tasks ?? [])
      .filter(isMeeting)
      .sort((a: any, b: any) => String(a.begin_date ?? '').localeCompare(String(b.begin_date ?? '')));
  }, [tasks]);

  const work = useMemo(() => {
    return (tasks ?? [])
      .filter((t: any) => !isMeeting(t))
      .sort((a: any, b: any) => String(b.begin_date ?? '').localeCompare(String(a.begin_date ?? ''))); // newest first
  }, [tasks]);

  function collapseDailyRecurring(tasks: any[]) {
    const byKey = new Map<string, any>();

    for (const t of tasks) {
      const rt = t.recurring_task; // nested object if present
      const freq = rt?.frequency;

      // Only collapse DAILY recurring
      const isDailyRecurring = Boolean(t.recurring_task_id) && freq === "daily";
      if (!isDailyRecurring) {
        byKey.set(`task:${t.id}`, t);
        continue;
      }

      // Group by recurring template id
      const key = `rt:${t.recurring_task_id}`;

      const existing = byKey.get(key);
      if (!existing) {
        // seed: store extra info we’ll use for display
        byKey.set(key, {
          ...t,
          __collapsed: true,
          __occurrenceCount: 1,
          __rangeStart: t.begin_date,
          __rangeEnd: t.begin_date,
        });
      } else {
        existing.__occurrenceCount += 1;

        // update range
        const d = t.begin_date;
        if (d && (!existing.__rangeStart || d < existing.__rangeStart)) existing.__rangeStart = d;
        if (d && (!existing.__rangeEnd || d > existing.__rangeEnd)) existing.__rangeEnd = d;

        byKey.set(key, existing);
      }
    }

    return Array.from(byKey.values());
  }

  const collapsedMeetings = collapseDailyRecurring(meetings);
  const collapsedWork = collapseDailyRecurring(work);

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
              collapsedMeetings={collapsedMeetings}
              collapsedWork={collapsedWork}
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
