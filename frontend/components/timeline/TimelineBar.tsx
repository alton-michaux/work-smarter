import { Task } from 'types/types';
import { computeBarPosition, todayStr } from 'lib/timelineUtils';

type Props = {
  task: Task;
  rangeStart: string;
  rangeEnd: string;
  projectColor?: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#9ca3af',
};

export default function TimelineBar({ task, rangeStart, rangeEnd, projectColor }: Props) {
  const { left, width } = computeBarPosition(task, rangeStart, rangeEnd);
  const color = projectColor ?? PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;
  const isDone = task.is_done;
  const today = todayStr();
  const isOngoing = !task.end_date || task.end_date >= today;

  const endLabel = task.end_date ?? (isOngoing ? 'ongoing' : '—');

  return (
    <div className="relative h-7">
      <div
        className={`absolute top-0.5 h-6 rounded flex items-center px-2 overflow-hidden cursor-default group ${isDone ? 'opacity-60' : ''}`}
        style={{ left, width, backgroundColor: color, minWidth: '4px' }}
      >
        <span className={`text-xs text-white font-medium truncate select-none ${isDone ? 'line-through' : ''}`}>
          {task.title}
        </span>

        {/* Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 w-60 bg-gray-900 dark:bg-gray-950 text-white text-xs rounded shadow-xl p-2.5 hidden group-hover:block z-50">
          <p className="font-semibold truncate">{task.title}</p>
          <p className="text-gray-300 mt-1">
            {task.begin_date} → {endLabel}
          </p>
          <p className="text-gray-400 mt-0.5 capitalize">
            {task.priority} · {isDone ? 'done' : 'in progress'}
          </p>
        </div>
      </div>
    </div>
  );
}
