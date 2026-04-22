import { useEffect } from "react";
import withAuth from "../lib/withAuth";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../context/TasksContext";
import { useProjects } from "../context/ProjectsContext";
import { useAPI } from "../context/APIContext";
import { useSystem } from "context/SystemsContext";

function Dashboard() {
  const router = useRouter();
  const { logout, loggedIn } = useAuth();

  const { exportCsv } = useSystem();
  const { fileUpload } = useAPI();
  const { fetchTasks } = useTasks();
  const { fetchProjects } = useProjects();

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [loggedIn]);

  const handleLogout = () => logout();

  const go = (path: string) => (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    router.push(path);
  };

  const handleDownload = async () => {
    exportCsv();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Page container */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Navigate your workspace, manage tasks, and export activity logs.
          </p>
        </div>

        {/* Main panel */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Workspace
              </div>
              <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                Quick actions
              </div>
            </div>

            {/* Optional: a subtle hint of status */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Signed in
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 align-middle" />
            </div>
          </div>

          {/* Action grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Projects */}
              <button
                onClick={go("/projects")}
                className="group rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-5 text-left hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Workspace
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Projects
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      View and organize your project list.
                    </div>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition">
                    →
                  </span>
                </div>
              </button>

              {/* Tasks */}
              <button
                onClick={go("/tasks")}
                className="group rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-5 text-left hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Workspace
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Tasks
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Daily log and weekly tracker.
                    </div>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition">
                    →
                  </span>
                </div>
              </button>

              {/* Imports */}
              <button
                onClick={go("/import")}
                className="group rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 p-5 text-left hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Data
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Imports
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Upload CSV files to populate tasks.
                    </div>
                  </div>
                  <span className="text-blue-300 dark:text-blue-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition">
                    →
                  </span>
                </div>
              </button>

              {/* Exports */}
              <button
                onClick={handleDownload}
                className="group rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 p-5 text-left hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Data
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Export
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Download your activity log as CSV.
                    </div>
                  </div>
                  <span className="text-blue-300 dark:text-blue-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition">
                    →
                  </span>
                </div>
              </button>

              {/* Resume */}
              <button
                onClick={go("/resume")}
                className="group rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-5 text-left hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Career
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Resume
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Upload and manage your resumes.
                    </div>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition">
                    →
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tip: An export with no data can be used as an import template.
            </div>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Dashboard);