import React, { useState } from 'react';
import { ProjectTimelineProps, TaskLike } from 'types/types';

const DAYS_PER_PAGE = 5;

export default function ProjectTimelineSection<T extends TaskLike>({
  title,
  summaryRight,
  emptyText,
  grouped,
  iconFor,
  metaFor,
  titleClassFor,
  onItemClick,
}: ProjectTimelineProps<T>) {
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);

  const visibleSortedDays = grouped.sortedDays.slice(0, visibleDays);
  const hasMore = visibleDays < grouped.sortedDays.length;
  const remaining = grouped.sortedDays.length - visibleDays;

  return (
    <section>
      {(title || summaryRight) && (
        <div className="flex items-baseline justify-between mb-3">
          {title && <h2 className="text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400">{title}</h2>}
          {summaryRight && <div className="text-xs text-gray-400 dark:text-gray-500">{summaryRight}</div>}
        </div>
      )}

      {grouped.sortedDays.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {visibleSortedDays.map((day) => (
              <div key={`${title}-${day}`}>
                <h3 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 mb-2">{day}</h3>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <ul>
                    {grouped.groups[day].map((t) => (
                      <li key={t.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 px-4 py-3 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onItemClick?.(t)}
                          className="flex items-start gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
                        >
                          <span className="mt-0.5 text-lg leading-none">{iconFor(t)}</span>
                          <div className="min-w-0">
                            <div
                              className={`font-medium ${titleClassFor?.(t) ?? 'text-gray-900 dark:text-gray-100'} truncate`}
                              title={String((t as any).title ?? '')}
                            >
                              {(t as any).title}
                            </div>
                            {metaFor ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleDays((v) => v + DAYS_PER_PAGE)}
              className="mt-4 w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              Load more ({remaining} day{remaining !== 1 ? 's' : ''} remaining)
            </button>
          )}
        </>
      )}
    </section>
  );
}
