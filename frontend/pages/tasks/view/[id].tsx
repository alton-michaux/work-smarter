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
  const { tasks, deleteTask, pushToCalendar, isLoading } = useTasks();
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();

  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);

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

  const handleEdit = () => {
    router.push(`/tasks/edit/${id}`);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this occurence?\n If this is a recurring event, all past and future occurences will be deleted as well")) return;

    try {
      await deleteTask(task);
      await router.push('/tasks');
    } catch (err) {
      toast.error('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href="/tasks" className="text-sm text-gray-600 hover:text-blue-600">
          ← All Tasks
        </a>

        <div className="flex items-center gap-2">
          {task.category === 'meeting' && calendarStatus?.connected && (
            <button
              onClick={handlePushToCalendar}
              disabled={isPushing}
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isPushing ? 'Syncing…' : task.google_event_id ? 'Re-sync to Calendar' : 'Push to Calendar'}
            </button>
          )}
          {/* replace with your Button later */}
          <a
            onClick={() => handleEdit()}
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {task.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5">
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
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
            <span className="text-xs text-gray-500">
              Task #{task.id}
            </span>
          </div>

          <MarkdownBody value={task.description} emptyText="No notes yet." />
        </div>

        {/* Details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{task.is_done ? "Done" : "Open"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Carry Over</dt>
              <dd className="text-gray-900">{task.carry_over ? "Yes" : "No"}</dd>
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Subtask</dt>
              <dd className="text-gray-900">{task.is_subtask ? "Yes" : "No"}</dd>
            </div>

            {/* Add your dates if available */}
            {task.begin_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Begin</dt>
                <dd className="text-gray-900">{task.begin_date}</dd>
              </div>
            ) : null}

            {task.end_date ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">End</dt>
                <dd className="text-gray-900">{task.end_date}</dd>
              </div>
            ) : null}

            {task.category === 'meeting' && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Calendar Sync</dt>
                <dd className="text-gray-900">
                  {task.google_event_id ? (
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
                <dt className="text-gray-500">User</dt>
                <dd className="text-gray-900">{task.user}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default TaskShowPage;