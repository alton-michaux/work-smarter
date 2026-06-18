import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from 'context/TasksContext';
import { useProjects } from 'context/ProjectsContext';
import Spinner from 'components/shared/Spinner';
import TimelineView from 'components/timeline/TimelineView';
import {
  groupTasksByProject,
  getMonthTicks,
  daysBetween,
  todayStr,
  subtractMonths,
  addMonths,
} from 'lib/timelineUtils';

type RangeMonths = 1 | 3 | 6;

export default function TimelinePage() {
  const router = useRouter();
  const { tasks, fetchTasksForTimeline, isLoading } = useTasks();
  const { projects } = useProjects();

  const [rangeMonths, setRangeMonths] = useState<RangeMonths>(3);
  // rangeEnd defaults to today; initialized client-side to avoid hydration mismatch
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  useEffect(() => {
    setRangeEnd(todayStr());
  }, []);

  const rangeStart = useMemo(
    () => (rangeEnd ? subtractMonths(rangeEnd, rangeMonths) : null),
    [rangeEnd, rangeMonths]
  );

  // Fetch when range changes; ref guards against stale-closure re-fetches
  const lastRangeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    const key = `${rangeStart}__${rangeEnd}`;
    if (lastRangeRef.current === key) return;
    lastRangeRef.current = key;
    fetchTasksForTimeline(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, fetchTasksForTimeline]);

  const groups = useMemo(
    () => (rangeStart && rangeEnd ? groupTasksByProject(tasks, projects) : []),
    [tasks, projects, rangeStart, rangeEnd]
  );

  const todayPct = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    const total = daysBetween(rangeStart, rangeEnd) || 1;
    const fromStart = daysBetween(rangeStart, todayStr());
    return Math.max(0, Math.min(100, (fromStart / total) * 100));
  }, [rangeStart, rangeEnd]);

  const monthTicks = useMemo(
    () => (rangeStart && rangeEnd ? getMonthTicks(rangeStart, rangeEnd) : []),
    [rangeStart, rangeEnd]
  );

  const handlePrev = () => {
    if (!rangeEnd) return;
    setRangeEnd(subtractMonths(rangeEnd, rangeMonths));
  };

  const handleNext = () => {
    if (!rangeEnd) return;
    setRangeEnd(addMonths(rangeEnd, rangeMonths));
  };

  const handleRangeChange = (months: RangeMonths) => {
    setRangeMonths(months);
    setRangeEnd(todayStr());
  };

  // Wait for client-side init
  if (!rangeStart || !rangeEnd) return null;

  const navBtnClass =
    'rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center px-4 py-10">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-3">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Timeline</h1>
              <div className="flex gap-2">
                <button type="button" onClick={() => router.push('/tasks')} className={navBtnClass}>
                  Daily Log
                </button>
                <button type="button" onClick={() => router.push('/tasks/tracker')} className={navBtnClass}>
                  Weekly Tracker
                </button>
                <button type="button" onClick={() => router.push('/dashboard')} className={navBtnClass}>
                  Dashboard
                </button>
              </div>
            </div>

            {/* Range controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {rangeStart} → {rangeEnd}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                Next →
              </button>

              {/* Range size selector */}
              <div className="ml-auto flex gap-1">
                {([1, 3, 6] as RangeMonths[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleRangeChange(m)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      rangeMonths === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <TimelineView
              groups={groups}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              todayPct={todayPct}
              monthTicks={monthTicks}
            />
          )}
        </div>
      </div>
    </div>
  );
}
