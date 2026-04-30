import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTasks } from '../../../context/TasksContext';
import { useAPI } from '../../../context/APIContext';
import { useAuth } from '../../../context/AuthContext';
import Spinner from 'components/shared/Spinner';
import EmptyStateCard from 'components/shared/EmptyStateCard';
import MarkdownBody from 'components/shared/MarkdownBody';
import { toast } from 'sonner';
import { GoogleCalendarStatus } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TaskShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, deleteTask, pushToCalendar, pushDeadlineToCalendar, blacklistEvent, isLoading } = useTasks();
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();

  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isSyncingDeadline, setIsSyncingDeadline] = useState(false);
  const [isBlacklisting, setIsBlacklisting] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    fetch(`${API_URL}/calendar/status/`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: GoogleCalendarStatus) => setCalendarStatus(data))
      .catch(() => {});
  }, [loggedIn]);

  const task = tasks?.find(t => t.id === Number(id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (      
      <EmptyStateCard
        title="Task not found"
        description="This task may have been deleted or the link is invalid."
        actions={[
          {
            label: "Back to Tasks",
            onClick: () => router.push("/tasks"),
            variant: "primary",
          },
        ]}
      />
    );
  }

  const qReturn = typeof router.query.returnTo === 'string' ? router.query.returnTo : '/tasks';
  const backLabel = qReturn === '/notes' ? '← All Notes' : '← All Tasks';

  const handleEdit = () => {
    router.push(`/tasks/edit/${id}?returnTo=${qReturn}`);
  };

  const handlePushToCalendar = async () => {
    if (!task) return;
    setIsPushing(true);
    try {
      await pushToCalendar(task.id);
      toast.success(task.google_event_id ? 'Meeting re-synced to Google Calendar.' : 'Meeting pushed to Google Calendar.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to push to Google Calendar.');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePushDeadline = async () => {
    if (!task) return;
    setIsSyncingDeadline(true);
    try {
      await pushDeadlineToCalendar(task.id);
      toast.success(task.deadline_event_id ? 'Deadline re-synced to Google Calendar.' : 'Deadline synced to Google Calendar.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync deadline.');
    } finally {
      setIsSyncingDeadline(false);
    }
  };

  const handleBlacklist = async () => {
    if (!task?.google_event_id) return;
    if (!confirm('Never import this event again?\n\nIt will be added to your blacklist. You can remove it from Settings.')) return;
    const shouldDelete = confirm('Also delete this task from Work Smarter?\n\nClick Cancel to keep the task.');
    setIsBlacklisting(true);
    try {
      await blacklistEvent(task.google_event_id, task.title, shouldDelete);
      toast.success('Event added to blacklist.');
      if (shouldDelete) router.push('/tasks');
    } catch (err: any) {
      toast.error(err.message || 'Failed to blacklist event.');
    } finally {
      setIsBlacklisting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this occurence?\n If this is a recurring event, all past and future occurences will be deleted as well")) return;

    try {
      await deleteTask(task);
      await router.push(qReturn);
    } catch (err) {
      toast.error('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href={qReturn} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
          {backLabel}
        </a>

        <div className="flex items-center gap-2">
          {task.category === 'meeting' && calendarStatus?.connected && (
            <button
              onClick={handlePushToCalendar}
              disabled={isPushing}
              className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {isPushing ? 'Syncing…' : task.google_event_id ? 'Re-sync to Calendar' : 'Push to Calendar'}
            </button>
          )}
          {task.deadline_date && calendarStatus?.connected && (
            <button
              onClick={handlePushDeadline}
              disabled={isSyncingDeadline}
              className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {isSyncingDeadline ? 'Syncing…' : task.deadline_event_id ? 'Re-sync deadline' : 'Sync deadline to Calendar'}
            </button>
          )}
          {task.category === 'meeting' && task.google_event_id && (
            <button
              onClick={handleBlacklist}
              disabled={isBlacklisting}
              className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {isBlacklisting ? 'Blacklisting…' : 'Never import again'}
            </button>
          )}
          {/* replace with your Button later */}
          <a
            onClick={() => handleEdit()}
            className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Edit
          </a>
          <button
            onClick={() => handleDelete()}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
              {task.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-600 px-2 py-0.5">
                {task.is_done ? "Done" : "Open"}
              </span>
              <span>•</span>
              <span className="capitalize">{task.category}</span>
              <span>•</span>
              <span className="capitalize">{task.priority}</span>
              {task.project ? (
                <>
                  <span>•</span>
                  <span>{task.project}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Optional: quick status toggle later */}
        </div>
      </div>

      {/* Content + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Markdown description */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Task #{task.id}
            </span>
          </div>

          <MarkdownBody value={task.description} emptyText="No notes yet." />
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="text-gray-900 dark:text-gray-100">{task.is_done ? "Done" : "Open"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500 dark:text-gray-400">Carry Over</dt>
              <dd className="text-gray-900 dark:text-gray-100">{task.carry_over ? "Yes" : "No"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500 dark:text-gray-400">Subtask</dt>
              <dd className="text-gray-900 dark:text-gray-100">{task.is_subtask ? "Yes" : "No"}</dd>
            </div>

            {/* Add your dates if available */}
            {task.begin_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Begin</dt>
                <dd className="text-gray-900 dark:text-gray-100">{task.begin_date}</dd>
              </div>
            ) : null}

            {task.end_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">End</dt>
                <dd className="text-gray-900 dark:text-gray-100">{task.end_date}</dd>
              </div>
            ) : null}

            {task.deadline_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Deadline</dt>
                <dd className={(() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const d = new Date(task.deadline_date + 'T00:00:00');
                  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                  if (!task.is_done && diff < 0) return 'font-medium text-red-600 dark:text-red-400';
                  if (!task.is_done && diff <= 3) return 'font-medium text-amber-600 dark:text-amber-400';
                  return 'text-gray-900 dark:text-gray-100';
                })()}>
                  {task.deadline_date}
                </dd>
              </div>
            ) : null}

            {task.category === 'meeting' && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Calendar Sync</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {task.google_event_id ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                      Synced
                    </span>
                  ) : 'Not synced'}
                </dd>
              </div>
            )}

            {task.deadline_date && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Deadline Sync</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {task.deadline_event_id ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                      Synced
                    </span>
                  ) : 'Not synced'}
                </dd>
              </div>
            )}

            {/* Keep IDs de-emphasized if you must show them */}
            {task.user ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">User</dt>
                <dd className="text-gray-900 dark:text-gray-100">{task.user}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default TaskShowPage;