// lib/collapseDailyRecurring.ts
type AnyTask = any;

type Options = {
  frequency?: "daily" | "weekly" | "monthly";
  /**
   * If the task doesn't include recurring_task.frequency (because recurring_task is just an id),
   * assume it matches the requested frequency.
   * This is safe if you only expect daily recurring in this view.
   */
  assumeMatchWhenMissingFrequency?: boolean;
};

export function collapseRecurringTasks(tasks: AnyTask[], opts: Options = {}) {
  const {
    frequency,
    assumeMatchWhenMissingFrequency = true,
  } = opts;

  const byKey = new Map<string, AnyTask>();

  for (const t of tasks) {
    const recurringId =
      t.recurring_task_id ??
      (typeof t.recurring_task === "number" ? t.recurring_task : t.recurring_task?.id);

    const recurringFreq =
      typeof t.recurring_task === "object" && t.recurring_task
        ? t.recurring_task.frequency
        : undefined;

    const isRecurring = Boolean(recurringId);

    // If we care about frequency, and we *can* read it, enforce it.
    // If we *can't* read it (recurring_task is just an id), optionally assume it matches.
    const matchesFrequency = frequency
      ? (recurringFreq ? recurringFreq === frequency : assumeMatchWhenMissingFrequency)
      : true;

    const shouldCollapse = isRecurring && matchesFrequency;

    if (!shouldCollapse) {
      byKey.set(`task:${t.id}`, t);
      continue;
    }

    const key = `rt:${recurringId}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        ...t,
        __collapsed: true,
        __occurrenceCount: 1,
        __rangeStart: t.begin_date,
        __rangeEnd: t.begin_date,
      });
    } else {
      existing.__occurrenceCount += 1;

      const d = t.begin_date;
      if (d && (!existing.__rangeStart || d < existing.__rangeStart)) existing.__rangeStart = d;
      if (d && (!existing.__rangeEnd || d > existing.__rangeEnd)) existing.__rangeEnd = d;

      byKey.set(key, existing);
    }
  }

  return Array.from(byKey.values());
}
