import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTasks } from "../../../context/TasksContext";
import { useProjects } from "../../../context/ProjectsContext";
import { useAPI } from "../../../context/APIContext";
import { useAuth } from "../../../context/AuthContext";
import TaskForm from "../../../components/tasks/TaskForm";
import Spinner from "components/shared/Spinner";
import EmptyStateCard from "components/shared/EmptyStateCard";
import { Task, TaskSubmission } from "types/types";
import { API_URL } from 'lib/api';


export default function TaskEditPage() {
  const router = useRouter();
  const { id } = router.query;

  const { tasks, updateTaskAndReload, isLoading } = useTasks();
  const { projects } = useProjects();
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();

  // Keyed by id: the page component is reused across /tasks/.../[id], so a
  // task fetched for one id must not stand in for the next.
  const [fetched, setFetched] = useState<{ id: string; task: Task } | null>(null);
  const fetchedTask = fetched && fetched.id === String(id) ? fetched.task : null;

  const taskInContext = tasks?.find((t) => t.id === Number(id));
  const task = taskInContext ?? fetchedTask;

  // Fallback for a task that isn't in the shared list (deep link, reload).
  // A failed fetch is remembered so it shows "not found" instead of retrying.
  const [failedFetchId, setFailedFetchId] = useState<string | null>(null);
  const isFetchingTask =
    Boolean(id) && !isLoading && !taskInContext && !fetchedTask && loggedIn && failedFetchId !== String(id);

  useEffect(() => {
    if (!isFetchingTask) return;
    fetch(`${API_URL}/tasks/${id}/`, {
        credentials: 'include', headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Task) => setFetched({ id: String(id), task: data }))
      .catch(() => setFailedFetchId(String(id)));
  }, [isFetchingTask, id, getAuthHeaders]);

  const projectOptions = projects;

  if (isLoading || isFetchingTask) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">        
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
      </div>
    );
  }

  const qReturn = typeof router.query.returnTo === 'string' ? router.query.returnTo : '/tasks';

  const handleUpdate = async (updatedTask: TaskSubmission) => {
    await updateTaskAndReload({ ...updatedTask, id: Number(id) });
    router.push(qReturn);
  };

  const backLabel = qReturn === '/notes' ? '← All Notes' : '← All Tasks';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={qReturn} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
          {backLabel}
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {qReturn === '/notes' ? 'Edit Note' : 'Edit Task'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update details and notes. Markdown preview is live because we are living in the future.
          </p>
        </div>

        <div className="px-6 py-6">
          <TaskForm
            initialTask={task}
            onSubmit={handleUpdate}
            submitLabel="Update"
            projects={projectOptions}
          />
        </div>
      </div>
    </div>
  );
}