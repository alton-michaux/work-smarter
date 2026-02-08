import { useEffect, useMemo, useState } from 'react';
import { splitIntoSections, categoryToType } from '../lib/dailyLog';

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function lastNDays(selectedDate: string, n = 7) {
  if (!selectedDate) return [];
  const base = new Date(`${selectedDate}T12:00:00`);
  const days: { key: string; label: string }[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });

    days.push({ key, label });
  }

  return days;
}

export function useDailyLog(
    tasks: any[],
    queryDate?: string,
    options?: { activeOn?: boolean }
  ) {

  const [selectedDate, setSelectedDate] = useState<string>('');

  // client-safe init + sync with query param
  useEffect(() => {
    if (queryDate) {
      setSelectedDate(queryDate);
      return;
    }
    setSelectedDate(todayYMD());
  }, [queryDate]);

  const days = useMemo(() => lastNDays(selectedDate, 7), [selectedDate]);
  
  const activeOn = options?.activeOn ?? false;

  const dailyTasks = useMemo(() => {
    const all = tasks || [];

    // Notes are "ongoing reminders" — keep them regardless of date
    const notes = all.filter((t) => categoryToType(t.category) === 'note');

    // Everything else is day-scoped
    const dayScoped = all.filter((t) => {
      const isNote = categoryToType(t.category) === 'note';
      if (isNote) return false;
      return (t.begin_date ?? '').slice(0, 10) === selectedDate;
    });

    return [...dayScoped, ...notes];
  }, [tasks, selectedDate]);

  const sections = useMemo(() => splitIntoSections(dailyTasks), [dailyTasks]);

  return {
    selectedDate,
    setSelectedDate,
    last7Days: days,
    dailyTasks,
    sections,
  };
}
