import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from 'context/TasksContext';
import NoteCard from 'components/notes/NoteCard';
import Spinner from 'components/shared/Spinner';
import EmptyStateCard from 'components/shared/EmptyStateCard';
import { priorityRank } from 'lib/dailyLog';
import withAuth from 'lib/withAuth';

function NotesPage() {
  const router = useRouter();
  const { notes, isLoadingNotes, fetchNotes, deleteTask } = useTasks();
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const { active, done } = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title?.toLowerCase().includes(q) ||
            n.description?.toLowerCase().includes(q)
        )
      : notes;

    const byPriorityThenDate = (a: typeof notes[0], b: typeof notes[0]) => {
      const pd = priorityRank(a.priority) - priorityRank(b.priority);
      if (pd !== 0) return pd;
      return String(b.begin_date ?? '').localeCompare(String(a.begin_date ?? ''));
    };

    return {
      active: filtered.filter((n) => !n.is_done).sort(byPriorityThenDate),
      done: filtered.filter((n) => n.is_done).sort(byPriorityThenDate),
    };
  }, [notes, search]);

  const handleDelete = async (id: number) => {
    const note = notes.find((n) => Number(n.id) === id);
    if (!confirm(`Delete "${note?.title ?? 'this note'}"?`)) return;
    await deleteTask(id);
    await fetchNotes();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-medium text-gray-700 dark:text-gray-300">Notes</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 w-48"
            />
            {done.length > 0 && (
              <button
                onClick={() => setShowDone((v) => !v)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  showDone
                    ? 'border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Done ({done.length})
              </button>
            )}
            <button
              onClick={() => router.push('/tasks/create?category=note&returnTo=/notes')}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              + New Note
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {isLoadingNotes ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : active.length === 0 && done.length === 0 ? (
          <EmptyStateCard
            title="No notes yet"
            description="Notes are persistent reference material — context, decisions, ongoing thoughts."
            actions={[
              {
                label: 'Create your first note',
                onClick: () => router.push('/tasks/create?category=note&returnTo=/notes'),
                variant: 'primary',
              },
            ]}
          />
        ) : (
          <div className={`grid gap-6 ${showDone ? 'grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
            {/* Active notes */}
            <div className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No open notes.</p>
              ) : (
                active.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    variant="default"
                    showMeta={true}
                    collapsible={true}
                    onView={(id) => router.push(`/tasks/view/${id}`)}
                    onEdit={(id) => router.push(`/tasks/edit/${id}?returnTo=/notes`)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Done notes panel */}
            {showDone && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                  <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 shrink-0">
                    Done
                  </span>
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="space-y-3">
                  {done.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      variant="default"
                      showMeta={true}
                      collapsible={true}
                      onView={(id) => router.push(`/tasks/view/${id}`)}
                      onEdit={(id) => router.push(`/tasks/edit/${id}?returnTo=/notes`)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(NotesPage);
