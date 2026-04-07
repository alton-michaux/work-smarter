import { useMemo } from 'react';
import { groupByBeginDate, isMeetingTask } from '../lib/projectInsights';

export function useProjectInsights(project: any, remainingLimit = 6) {
  return useMemo(() => {
    const tasks = project?.dashboard_tasks ?? project?.tasks ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const meetings = tasks
      .filter(isMeetingTask)
      .filter((t: any) => (t.begin_date ?? '') >= today);
    const work = tasks.filter((t: any) => !isMeetingTask(t));

    const meetingsGrouped = groupByBeginDate(meetings, 'desc');
    const workGrouped = groupByBeginDate(work, 'asc');

    const totalCount = tasks.length;
    const doneCount = tasks.filter((t: any) => t.is_done).length;

    const allDays = Array.from(
      new Set([...(meetingsGrouped.sortedDays ?? []), ...(workGrouped.sortedDays ?? [])])
    ).sort().reverse();

    const activeStart = allDays.length ? allDays[allDays.length - 1] : '—';
    const activeEnd = allDays.length ? allDays[0] : '—';
    const lastActivity = activeEnd;

    const remainingWork = work
      .filter((t: any) => !t.is_done)
      .sort((a: any, b: any) =>
        String(a.begin_date ?? '').localeCompare(String(b.begin_date ?? ''))
      );

    const remainingCount = remainingWork.length;
    const remainingPreview = remainingWork.slice(0, remainingLimit);
    const remainingOverflow = Math.max(0, remainingCount - remainingPreview.length);

    const meetingsCount = meetings.length;

    const workTotal = work.length;
    const workDone = work.filter((t: any) => t.is_done).length;
    const workOpen = workTotal - workDone;

    return {
      meetings,
      work,
      meetingsGrouped,
      workGrouped,

      totalCount,
      doneCount,
      activeStart,
      activeEnd,
      lastActivity,

      remainingCount,
      remainingPreview,
      remainingOverflow,

      meetingsCount,
      workTotal,
      workDone,
      workOpen,
    };
  }, [project, remainingLimit]);
}
