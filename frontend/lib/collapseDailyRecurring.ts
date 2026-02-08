import { Task, WeeklyOptions } from "types/types";

function toISODate(d: any): string | null {
  if (!d) return null;
  // backend sometimes returns "YYYY-MM-DD" already; sometimes full ISO.
  return String(d).slice(0, 10);
}

function isConsecutiveDaily(dates: string[]): boolean {
  const uniq = Array.from(new Set(dates.filter(Boolean))).sort(); // YYYY-MM-DD sorts correctly
  if (uniq.length < 2) return false;

  const toMs = (s: string) => new Date(`${s}T00:00:00`).getTime();

  for (let i = 1; i < uniq.length; i++) {
    const diffDays = (toMs(uniq[i]) - toMs(uniq[i - 1])) / (1000 * 60 * 60 * 24);
    if (diffDays !== 1) return false;
  }
  return true;
}

/**
 * Collapses recurring tasks into a single row per recurring series.
 * Intended use: weekly tracker "collapse daily recurring tasks" so you get one row with a pill.
 *
 * IMPORTANT:
 * - If options.frequency === "daily", we only collapse series we *know* are daily OR can safely infer daily
 *   by seeing consecutive dates in the returned occurrences for the week.
 */
export function collapseRecurringTasks<T extends Task>(
  tasks: T[],
  options: WeeklyOptions = { frequency: "daily" }
): (T & {
  __collapsed?: boolean;
  __occurrenceCount?: number;
  __rangeStart?: string | null;
  __rangeEnd?: string | null;
  __collapseLabel?: string; // e.g. "Daily ↻ (5x)"
})[] {
  const desiredFreq = options.frequency;

  // Non-recurring tasks keep their own identity
  // Recurring tasks group by recurring_task_id
  const groups = new Map<string, {
    seed: T;
    items: T[];
    beginDates: string[];
  }>();

  for (const t of tasks) {
    const rtId = t.recurring_task_id;
    const isRecurring = Boolean(rtId);

    if (!isRecurring) {
      groups.set(`task:${t.id}`, { seed: t, items: [t], beginDates: [toISODate(t.begin_date)].filter(Boolean) as string[] });
      continue;
    }

    const key = `rt:${rtId}`;
    const existing = groups.get(key);
    const d = toISODate(t.begin_date);
    if (!existing) {
      groups.set(key, { seed: t, items: [t], beginDates: d ? [d] : [] });
    } else {
      existing.items.push(t);
      if (d) existing.beginDates.push(d);
    }
  }

  const out: any[] = [];

  for (const g of Array.from(groups.values())) {
    const { seed, items, beginDates } = g;

    const recurringFreq = String(seed?.recurring_task?.frequency ?? "").toLowerCase() || null;

    // Decide if THIS GROUP should collapse
    let shouldCollapse = Boolean(seed.recurring_task_id);

    if (desiredFreq) {
      if (recurringFreq) {
        // we know frequency; enforce it
        shouldCollapse = shouldCollapse && recurringFreq === desiredFreq;
      } else {
        // we DON'T know frequency; only allow daily collapse if we can infer daily
        if (desiredFreq === "daily") {
          shouldCollapse = shouldCollapse && isConsecutiveDaily(beginDates);
        } else {
          // if they ask weekly/monthly and we can't read it, do not guess
          shouldCollapse = false;
        }
      }
    }

    // If not collapsing, just emit all items as-is (important: keep original rows)
    if (!shouldCollapse) {
      out.push(...items);
      continue;
    }

    // Collapsed row: keep the seed but annotate
    const sortedDates = Array.from(new Set(beginDates)).sort();
    const rangeStart = sortedDates[0] ?? null;
    const rangeEnd = sortedDates[sortedDates.length - 1] ?? null;

    const count = items.length;
    const labelFreq = desiredFreq === "daily" ? "Daily" : desiredFreq[0].toUpperCase() + desiredFreq.slice(1);
    out.push({
      ...seed,
      __collapsed: true,
      __occurrenceCount: count,
      __rangeStart: rangeStart,
      __rangeEnd: rangeEnd,
      __collapseLabel: `${labelFreq} ↻ (${count}x)`,
    });
  }

  return out;
}
