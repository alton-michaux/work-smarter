import { useState } from 'react';
import { ProjectGroup, MonthTick } from 'lib/timelineUtils';
import TimelineBar from './TimelineBar';

type Props = {
  groups: ProjectGroup[];
  rangeStart: string;
  rangeEnd: string;
  todayPct: number;
  monthTicks: MonthTick[];
};

const groupKey = (g: ProjectGroup) => String(g.projectId ?? 'none');

export default function TimelineView({ groups, rangeStart, rangeEnd, todayPct, monthTicks }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(groupKey(g)));
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map(groupKey)));

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
        No tasks with dates found in this time range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {groups.length > 1 && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-blue-500 hover:underline"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
      )}

      {/* X-axis: month labels + today marker */}
      <div className="flex">
        <div className="w-44 flex-shrink-0" />
        <div className="flex-1 relative h-8 border-b border-gray-200 dark:border-gray-600">
          {monthTicks.map((tick) => (
            <div
              key={tick.label}
              className="absolute top-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
              style={{ left: `${tick.leftPct.toFixed(2)}%` }}
            >
              {tick.label}
            </div>
          ))}
          {/* Today marker */}
          <div
            className="absolute top-0 h-full w-px bg-blue-400 dark:bg-blue-500"
            style={{ left: `${todayPct.toFixed(2)}%` }}
          />
        </div>
      </div>

      {/* Project groups */}
      {groups.map((group) => {
        const key = groupKey(group);
        const isCollapsed = collapsed.has(key);
        return (
        <div key={key} className={isCollapsed ? 'mb-1' : 'mb-6'}>
          {/* Project header (click to collapse/expand) */}
          <button
            type="button"
            onClick={() => toggle(key)}
            aria-expanded={!isCollapsed}
            className="w-full flex items-center gap-2 py-1.5 px-2 mt-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-left transition"
          >
            <span
              className={`text-[10px] text-gray-400 dark:text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            >
              ▼
            </span>
            {group.projectColor && (
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.projectColor }}
              />
            )}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {group.projectName}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </button>

          {/* Task rows */}
          {!isCollapsed && (
          <div className="mt-1">
            {group.tasks.map((task) => (
              <div key={task.id} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded">
                {/* Label column */}
                <div className="w-44 flex-shrink-0 pr-3 py-0.5">
                  <span
                    className={`text-xs truncate block ${
                      task.is_done
                        ? 'text-gray-400 dark:text-gray-500 line-through'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative py-0.5">
                  {/* Today marker in each row */}
                  <div
                    className="absolute top-0 h-full w-px bg-blue-200 dark:bg-blue-800 pointer-events-none"
                    style={{ left: `${todayPct.toFixed(2)}%` }}
                  />
                  <TimelineBar
                    task={task}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    projectColor={group.projectColor}
                  />
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
