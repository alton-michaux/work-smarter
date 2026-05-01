import React from 'react';
import { Task } from 'types/types';
import { buildTree } from '../../lib/dailyLog';
import OutlineTree from './OutlineTree';

type SearchResultsProps = {
  results: Task[];
  query: string;
  isSearching: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (task: any) => void;
  onToggleDone: (id: number, isDone: boolean) => void;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SearchResults({
  results,
  query,
  isSearching,
  onView,
  onEdit,
  onDelete,
  onToggleDone,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
        Searching…
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-8 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          No results for <span className="font-medium">"{query}"</span>.
        </p>
      </div>
    );
  }

  const grouped = results.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.begin_date?.slice(0, 10) ?? 'No date';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'No date') return 1;
    if (b === 'No date') return -1;
    return b.localeCompare(a);
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {results.length} result{results.length !== 1 ? 's' : ''} for <span className="font-medium">"{query}"</span>
      </p>
      {sortedKeys.map((dateKey) => (
        <div key={dateKey} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <span className="text-[11px] font-semibold tracking-widest text-gray-600 dark:text-gray-400 uppercase">
              {dateKey === 'No date' ? 'No date' : formatDate(dateKey)}
            </span>
          </div>
          <div className="p-3">
            <OutlineTree
              nodes={buildTree(grouped[dateKey])}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
