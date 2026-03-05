import { useRouter } from "next/router";
import Link from "next/link";
import { useTasks } from "../../../context/TasksContext";
import { useProjects } from "../../../context/ProjectsContext";
import TaskForm from "../../../components/tasks/TaskForm";
import Spinner from "components/shared/Spinner";
import EmptyStateCard from "components/shared/EmptyStateCard";

export default function TaskEditPage() {
  const router = useRouter();
  const { id } = router.query;

  const { tasks, updateTaskAndReload, isLoading } = useTasks();
  const { projects } = useProjects();

  const task = tasks?.find((t) => t.id === Number(id));

  const projectOptions = Array.isArray(projects)
    ? projects
    : projects && typeof projects === "object" && "results" in projects
    ? (projects as any).results
    : [];

  if (isLoading && !task) {
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

  const handleUpdate = async (updatedTask: any) => {
    await updateTaskAndReload({ ...updatedTask, id: Number(id) });
    router.push(`/tasks/view/${id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/tasks" className="text-sm text-gray-600 hover:text-blue-600">
          ← All Tasks
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">Edit Task</h1>
          <p className="text-sm text-gray-500">
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