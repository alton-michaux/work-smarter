import { Task, Project } from 'types/types';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00');
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

export type BarPosition = { left: string; width: string };

export function computeBarPosition(
  task: Task,
  rangeStart: string,
  rangeEnd: string
): BarPosition {
  const total = daysBetween(rangeStart, rangeEnd) || 1;
  const today = todayStr();

  // Clamp task start to range
  const taskStart = task.begin_date < rangeStart ? rangeStart : task.begin_date;
  // Ongoing tasks extend to today (or rangeEnd if today is past it)
  const effectiveEnd = task.end_date ?? today;
  const taskEnd = effectiveEnd > rangeEnd ? rangeEnd : effectiveEnd;

  const leftDays = Math.max(0, daysBetween(rangeStart, taskStart));
  // +1 so that a task starting and ending on the same day still shows as 1 day wide
  const rightDays = Math.min(total, daysBetween(rangeStart, taskEnd) + 1);
  const widthDays = Math.max(1, rightDays - leftDays);

  const leftPct = (leftDays / total) * 100;
  // Minimum 0.5% so single-day tasks are visible even in wide date ranges
  const widthPct = Math.max(0.5, (widthDays / total) * 100);

  return {
    left: `${leftPct.toFixed(2)}%`,
    width: `${widthPct.toFixed(2)}%`,
  };
}

export type ProjectGroup = {
  projectId: number | null;
  projectName: string;
  projectColor: string | undefined;
  tasks: Task[];
};

export function groupTasksByProject(
  tasks: Task[],
  projects: Project[]
): ProjectGroup[] {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const groupMap = new Map<number | null, Task[]>();

  for (const task of tasks) {
    const pid = task.project ?? null;
    if (!groupMap.has(pid)) groupMap.set(pid, []);
    groupMap.get(pid)!.push(task);
  }

  for (const tasks of groupMap.values()) {
    tasks.sort((a, b) => (a.begin_date ?? '').localeCompare(b.begin_date ?? ''));
  }

  const named: ProjectGroup[] = [];
  for (const [pid, tasks] of groupMap) {
    if (pid === null) continue;
    const project = projectMap.get(pid);
    named.push({
      projectId: pid,
      projectName: project?.name ?? 'Unknown',
      projectColor: project?.color,
      tasks,
    });
  }
  named.sort((a, b) => a.projectName.localeCompare(b.projectName));

  if (groupMap.has(null)) {
    named.push({
      projectId: null,
      projectName: 'No project',
      projectColor: undefined,
      tasks: groupMap.get(null)!,
    });
  }

  return named;
}

export type MonthTick = { label: string; leftPct: number };

export function getMonthTicks(rangeStart: string, rangeEnd: string): MonthTick[] {
  const total = daysBetween(rangeStart, rangeEnd) || 1;
  const ticks: MonthTick[] = [];

  const start = new Date(rangeStart + 'T00:00:00');
  const end = new Date(rangeEnd + 'T00:00:00');

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const tickDate = cursor.toISOString().slice(0, 10);
    const days = daysBetween(rangeStart, tickDate);
    ticks.push({
      label: cursor.toLocaleString('default', { month: 'short', year: 'numeric' }),
      leftPct: (Math.max(0, days) / total) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return ticks;
}

export function subtractMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
