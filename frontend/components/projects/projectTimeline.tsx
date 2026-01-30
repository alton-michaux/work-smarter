import React from 'react';

type TaskLike = {
  id: number | string;
  title: string;
  begin_date?: string | null;
  priority?: string | null;
  is_done?: boolean;
};

type Grouped<T> = {
  groups: Record<string, T[]>;
  sortedDays: string[];
};

type Props<T extends TaskLike> = {
  title: string; // "MEETINGS" | "WORK"
  summaryRight?: React.ReactNode; // e.g. "12 total • 7 done • 5 open"
  emptyText: string;

  iconFor: (t: T) => React.ReactNode; // 🗓️ or ☐/☑
  metaFor?: (t: T) => React.ReactNode; // optional second line
  titleClassFor?: (t: T) => string; // e.g. line-through for done

  grouped: Grouped<T>;
  onItemClick?: (t: T) => void;
};

export default function ProjectTimelineSection<T extends TaskLike>({
  title,
  summaryRight,
  emptyText,
  grouped,
  iconFor,
  metaFor,
  titleClassFor,
  onItemClick,
}: Props<T>) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-bold tracking-widest text-gray-500">{title}</h2>
        {summaryRight ? <div className="text-xs text-gray-400">{summaryRight}</div> : null}
      </div>

      {grouped.sortedDays.length === 0 ? (
        <div className="text-sm text-gray-500 rounded border bg-white px-4 py-3">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.sortedDays.map((day) => (
            <div key={`${title}-${day}`}>
              <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-2">{day}</h3>
              <div className="rounded border bg-white">
                <ul>
                  {grouped.groups[day].map((t) => (
                    <li key={t.id} className="border-b last:border-b-0 px-4 py-3 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onItemClick?.(t)}
                        className="flex items-start gap-3 w-full text-left hover:bg-gray-50 px-2 py-1 rounded"
                      >
                        <span className="mt-0.5 text-lg leading-none">{iconFor(t)}</span>
                        <div className="min-w-0">
                          <div className={`font-medium ${titleClassFor?.(t) ?? 'text-gray-900'}`}>
                            {t.title}
                          </div>
                          {metaFor ? (
                            <div className="text-xs text-gray-500 mt-1">
                              {metaFor(t)}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
