import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../lib/dateUtils';
import WeekSelector from '../../../components/ui/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';
import Spinner from 'components/shared/Spinner';
import { collapseRecurringTasks } from "../../../lib/collapseDailyRecurring";

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
  console.log("sample keys:", meetings?.[0] ? Object.keys(meetings[0]) : "no meetings");

  const collapsedMeetings = useMemo(
    () => collapseRecurringTasks(meetings, { frequency: "daily" }),
    [meetings]
  );

  const collapsedWork = useMemo(
    () => collapseRecurringTasks(work, { frequency: "daily" }),
    [work]
  );

  useEffect(() => {
    console.log("meetings:", meetings.length, "collapsedMeetings:", collapsedMeetings.length);
    console.log("work:", work.length, "collapsedWork:", collapsedWork.length);
    console.log("collapsedMeetings has __collapsed?", collapsedMeetings.some((t: any) => t.__collapsed));
    console.log("collapsedWork has __collapsed?", collapsedWork.some((t: any) => t.__collapsed));
  }, [meetings.length, work.length, collapsedMeetings.length, collapsedWork.length]);

  // Don't render until selectedWeek is set (avoids hydration mismatch)
  if (!selectedWeek) return null;

  console.log("sample recurring:", meetings?.[0]?.recurring_task_id, meetings?.[0]?.recurring_task);

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
              meetings={collapsedMeetings as any}
              work={collapsedWork as any}
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
