import { useProjects } from "../../context/ProjectsContext";
import { useRouter } from "next/router";
import Spinner from "components/shared/Spinner";

const ProjectsPage = () => {
  const { projects, deleteProject, isLoading } = useProjects();
  const router = useRouter();

  const results = Array.isArray(projects)
    ? projects
    : (projects as any)?.results ?? [];

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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create, review, and manage your workspaces.
            </p>
          </div>

          <button
            onClick={() => router.push("/projects/create")}
            className="shrink-0 rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
          >
            + New Project
          </button>
        </div>

        {/* Main panel */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Workspace
            </div>
            <div className="text-xs text-gray-500">
              {isLoading ? "Loading…" : `${results.length} total`}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <div className="text-sm font-medium text-gray-900">
                  No projects found
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Create a project to start organizing your tasks.
                </div>
                <button
                  onClick={() => router.push("/projects/create")}
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
                >
                  + New Project
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 overflow-hidden">
                {/* “Table” header row */}
                <div className="grid grid-cols-12 gap-4 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-8">Name</div>
                  <div className="col-span-4 text-right">Actions</div>
                </div>

                {/* Rows */}
                <ul className="divide-y divide-gray-200">
                  {results.map((project: any) => (
                    <li
                      key={project.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition"
                    >
                      <div className="col-span-8 min-w-0">
                        <button
                          onClick={() => handleProjectClick(project.id)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-700 transition truncate text-left"
                          title={project.name}
                        >
                          {project.name}
                        </button>
                      </div>

                      <div className="col-span-4 flex justify-end gap-3">
                        <button
                          onClick={() => handleEdit(project.id)}
                          className="text-sm text-gray-600 hover:text-gray-900 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-sm text-red-600 hover:text-red-800 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              ← Back
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;