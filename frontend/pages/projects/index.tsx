import { useProjects } from "../../context/ProjectsContext";
import { useRouter } from "next/router";
import Spinner from "components/shared/Spinner";
import EmptyStateCard from "components/shared/EmptyStateCard";

export default function ProjectsPage() {
  const { projects, deleteProject, isLoading } = useProjects();
  const router = useRouter();

  const results = Array.isArray(projects) ? projects : (projects as any)?.results ?? [];

  const handleProjectClick = (id: number) => {
    router.push(`/projects/view/${id}`);
  };

  const handleEdit = (id: number) => {
    router.push(`/projects/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your workspace. Open a project to view meetings, tasks, and activity.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/projects/create")}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              type="button"
            >
              + New Project
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Workspace
            </div>
            <div className="text-xs text-gray-500">
              {results.length} total
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-10 text-center">              
              <EmptyStateCard
                title="No Projects Yet"
                description="Create a project or import tasks with projects to populate this page"
                actions={[
                  {
                    label: "Back to Dashboard",
                    onClick: () => router.push("/dashboard"),
                    variant: "primary",
                  },
                ]}
              />
              <div className="mt-5">
                <button
                  onClick={() => router.push("/projects/create")}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                  type="button"
                >
                  + Create Project
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {results.map((project: any) => (
                <li key={project.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Clickable main area */}
                    <button
                      onClick={() => handleProjectClick(project.id)}
                      className="min-w-0 flex-1 text-left rounded-md px-3 py-2 hover:bg-gray-50 transition"
                      type="button"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          <div className="h-9 w-9 rounded-md bg-blue-50 flex items-center justify-center text-blue-700 text-sm font-semibold">
                            {String(project.name ?? "P").trim().slice(0, 1).toUpperCase()}
                          </div>
                          <span
                            className={[
                              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                              project.status === 'complete' ? "bg-gray-400" : "bg-green-500",
                            ].join(" ")}
                            title={project.status === 'complete' ? 'Complete' : 'Active'}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {project.name}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500 truncate">
                            {[project.role, project.description
                              ? project.description.length > 60
                                ? project.description.slice(0, 60) + '…'
                                : project.description
                              : null
                            ].filter(Boolean).join(' · ') || 'Open project'}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleEdit(project.id)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(project.id)}
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}