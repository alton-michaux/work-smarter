import { FixedSizeList as List } from 'react-window';
import { useEffect, useMemo, useCallback, useState } from 'react';
import { useTasks } from '../../context/TasksContext';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { categoryToType, buildTree, splitIntoSections } from 'lib/dailyLog';
import { DateToggleUI } from 'components/ui/dateToggleUI';

const ROW_HEIGHT = 88; // adjust if your rows are taller/shorter
const LIST_HEIGHT = 600;

const TasksPage = () => {
  const {
    tasks,
    deleteTask,
    isLoading,
    error,
    nextUrl,
    resetAndFetch,
    loadMore,
  } = useTasks();
  const router = useRouter();

  // Initial load — align with backend CursorPagination.ordering
  const { loggedIn } = useAuth();

  useEffect(() => {
    if (loggedIn) {
      resetAndFetch({ ordering: '-begin_date' });
    }
    // Only run when auth state flips
  }, [loggedIn, resetAndFetch]);

  const handleTaskClick = useCallback((id: number) => {
    router.push(`/tasks/view/${id}`);
  }, [router]);

  const handleEdit = useCallback((id: number) => {
    router.push(`/tasks/edit/${id}`);
  }, [router]);

  const handleDelete = useCallback(async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      // No need to manually refetch here; your context’s deleteTask already refreshes
    }
  }, [deleteTask]);

  const OutlineRow = ({
    node,
    depth,
  }: {
    node: any;
    depth: number;
  }) => {
    const type = categoryToType(node.category);

    return (
      <li
        className="border-b px-4 py-3 flex justify-between items-start group"
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        <div className="min-w-0">
          <button
            onClick={(e) => { e.preventDefault(); handleTaskClick(node.id); }}
            className="text-lg font-semibold text-blue-600 hover:underline text-left truncate"
            title={node.title}
          >
            {/* simple type cue */}
            {type === 'meeting' ? '🗓️ ' : type === 'task' ? '☐ ' : '• '}
            {node.title}
          </button>

          <p className="text-xs text-gray-500 mt-1">
            {(node.priority ?? '').toUpperCase()} • {node.begin_date ?? '—'}
          </p>
        </div>

        {/* actions only on hover */}
        <div className="flex-shrink-0 hidden group-hover:flex space-x-3">
          <button
            onClick={() => handleEdit(node.id)}
            className="text-sm text-yellow-600 hover:text-yellow-800"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(node.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  const OutlineTree = ({ nodes, depth = 0 }: { nodes: any[]; depth?: number }) => (
    <ul>
      {nodes.map((n) => (
        <div key={n.id}>
          <OutlineRow node={n} depth={depth} />
          {n.children?.length ? <OutlineTree nodes={n.children} depth={depth + 1} /> : null}
        </div>
      ))}
    </ul>
  );

  // Row renderer for react-window
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index];
    return (
      <li style={style} className="border-b px-4 py-4 flex justify-between items-start">
        <div className="min-w-0">
          <button
            onClick={(e) => { e.preventDefault(); handleTaskClick(task.id); }}
            className="text-lg font-semibold text-blue-600 hover:underline text-left truncate"
            title={task.title}
          >
            {task.title}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">Category:</span> {task.category ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(task.priority ?? '').toUpperCase()} • {task.begin_date ?? '—'}
          </p>
        </div>

        <div className="flex-shrink-0 flex space-x-3">
          <button
            onClick={() => handleEdit(task.id)}
            className="text-sm text-yellow-600 hover:text-yellow-800"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(task.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  // Memoize counts to avoid unnecessary renders
  const itemCount = useMemo(() => tasks.length, [tasks.length]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  // set on client after mount (avoids hydration mismatch)
  useEffect(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const last7Days = useMemo(() => {
    if (!selectedDate) return [];
    const base = new Date(`${selectedDate}T12:00:00`); // noon avoids DST edge weirdness
    const days: { key: string; label: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const label = d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon, Tue…
      days.push({ key, label });
    }

    return days;
  }, [selectedDate]);

  const dailyTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter(t => (t.begin_date ?? '').slice(0, 10) === selectedDate);
  }, [tasks, selectedDate]);

  // const dailyTasks = useMemo(() => tasks, [tasks]);

  const sections = useMemo(() => splitIntoSections(dailyTasks), [dailyTasks]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Daily Log</h1>

        {/* Day toggler */}
        {<DateToggleUI selectedDate={selectedDate} setSelectedDate={setSelectedDate} last7Days={last7Days} />}

        {/* Create New Task */}
        <div className="mb-6 text-center">
          <button
            onClick={() => router.push('/tasks/create')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            + Create New Task
          </button>
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Empty / Loading / Content state */}
        {!selectedDate ? (
          <p className="text-gray-600 text-center">Loading…</p>
        ) : (!isLoading && dailyTasks.length === 0 ? (
          <p className="text-gray-600 text-center">No entries for {selectedDate}.</p>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">MEETINGS</h2>
              <div className="rounded border">
                {sections.meetings.length ? <OutlineTree nodes={sections.meetings} /> : (
                  <div className="px-4 py-3 text-sm text-gray-500">No meetings.</div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">TASKS</h2>
              <div className="rounded border">
                {sections.tasks.length ? <OutlineTree nodes={sections.tasks} /> : (
                  <div className="px-4 py-3 text-sm text-gray-500">No tasks.</div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">NOTES</h2>
              <div className="rounded border">
                {sections.notes.length ? <OutlineTree nodes={sections.notes} /> : (
                  <div className="px-4 py-3 text-sm text-gray-500">No notes.</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Bottom Navigation */}
        <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => router.push('/tasks/tracker')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            View Weekly Tracker
          </button>

          <div className="flex space-x-4">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:underline"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
