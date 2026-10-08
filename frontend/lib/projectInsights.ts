type Dated = { begin_date?: string | null };

export function taskDay(t: Dated) {
  return (t.begin_date ?? '').slice(0, 10);
}

export function isMeetingTask(t: { category?: string | null }) {
  const c = String(t.category ?? '').trim().toLowerCase();
  return c === 'meeting' || c === 'meetings';
}

export function groupByBeginDate<T extends Dated>(tasks: T[], direction: 'asc' | 'desc' = 'desc') {
  const groups: Record<string, T[]> = {};

  for (const t of tasks || []) {
    const day = (t.begin_date ?? '—').slice(0, 10);
    groups[day] = groups[day] || [];
    groups[day].push(t);
  }

  // newest day first
  const sortedDays = Object.keys(groups).sort().reverse();
  if (direction === 'desc') sortedDays.reverse();

  return { groups, sortedDays };
}
