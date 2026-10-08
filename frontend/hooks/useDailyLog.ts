import { useMemo, useState } from 'react';
import { splitIntoSections, categoryToType } from '../lib/dailyLog';
import type { Task } from 'types/types';
import { useClientValue } from './useClientValue';

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
    tasks: Task[],
    queryDate?: string,
    options?: { activeOn?: boolean; ready?: boolean }
  ) {

  const [selectedDate, setSelectedDate] = useState<string>('');
  const ready = options?.ready ?? true;

  // client-safe init + sync with query param. Wait until the caller says the
  // query is known (router.isReady); otherwise a back-navigation to
  // /tasks?date=X would pick today first and fetch the wrong day. Also wait
  // for hydration: with no query, isReady is already true while hydrating,
  // and rendering today's date then wouldn't match the server HTML.
  const hydrated = useClientValue(() => true);
  const syncKey = ready && hydrated ? (queryDate ?? '') : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if (syncKey !== null) setSelectedDate(queryDate || todayYMD());
  }

  const days = useMemo(() => lastNDays(selectedDate, 7), [selectedDate]);
  
  const activeOn = options?.activeOn ?? false;

  const dailyTasks = useMemo(() => {
    const all = tasks || [];

    // ✅ If backend is returning "active on day" tasks,
    // don't re-filter by begin_date or you'll delete carry-overs.
    if (activeOn) {
      return all.filter((t) => categoryToType(t.category) !== "note");
    }

    // Otherwise, classic "day-scoped"
    return all.filter((t) => {
      if (categoryToType(t.category) === "note") return false;
      return (t.begin_date ?? "").slice(0, 10) === selectedDate;
    });
  }, [tasks, selectedDate, activeOn]);

  const sections = useMemo(() => splitIntoSections(dailyTasks), [dailyTasks]);

  return {
    selectedDate,
    setSelectedDate,
    last7Days: days,
    dailyTasks,
    sections,
  };
}
