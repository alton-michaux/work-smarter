import React from 'react';

type TaskLike = {
  id: number | string;
  title: string;
  begin_date?: string | null;
  priority?: string | null;
  is_done?: boolean;
};

type Props = {
  totalCount: number;
  doneCount: number;
  activeStart: string;
  activeEnd: string;
  lastActivity: string;

  remainingPreview: TaskLike[];
  remainingCount: number;
  remainingOverflow: number;
  remainingLimit?: number;
};

export default function ProjectSummaryCards({
  totalCount,
  doneCount,
  activeStart,
  activeEnd,
  lastActivity,
  remainingPreview,
  remainingCount,
  remainingOverflow,
}: Props) {
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <>
      {/* Progress */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">
              Progress: <span className="font-medium text-gray-900">{doneCount}</span> / {totalCount} done
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Active days: {activeStart} – {activeEnd} • Last activity: {lastActivity}
            </div>
          </div>

          <div className="text-sm font-medium text-gray-700">{progressPct}%</div>
        </div>

        <div className="mt-3 h-2 w-full rounded bg-gray-100 overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* What's left */}
      <div className="mb-8 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">What’s left</h3>
          <div className="text-xs text-gray-500">{remainingCount} open</div>
        </div>

        {remainingCount === 0 ? (
          <div className="mt-3 text-sm text-gray-500">All caught up 🎉</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {remainingPreview.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg leading-none">☐</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                  <div className="text-xs text-gray-500">
                    {(t.begin_date ?? '').slice(0, 10) || '—'}
                    {t.priority ? ` • ${String(t.priority).toUpperCase()}` : ''}
                  </div>
                </div>
              </li>
            ))}

            {remainingOverflow > 0 && (
              <li className="text-xs text-gray-500 pt-1">
                +{remainingOverflow} more
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}
