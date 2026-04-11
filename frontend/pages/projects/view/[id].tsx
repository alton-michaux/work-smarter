import React from "react";
import { useRouter } from "next/router";
import { useProjects } from "../../../context/ProjectsContext";
import Spinner from "components/shared/Spinner";
import { taskDay } from "../../../lib/projectInsights";
import ProjectTimelineSection from "../../../components/projects/projectTimeline";
import ProjectSummaryCards from "components/projects/ProjectSummaryCards";
import EmptyStateCard from "components/shared/EmptyStateCard";
import { useProjectInsights } from "../../../hooks/useProjectInsights";

const ProjectShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { projects, isLoading } = useProjects();

  const list = Array.isArray(projects) ? projects : (projects as any)?.results ?? [];
  const project = list.find((p) => p.id === Number(id));
  const insights = useProjectInsights(project);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12">          
          <EmptyStateCard
            title="Project not found"
            description="This project may have been deleted or the link is invalid."
            actions={[
              {
                label: "Back to Projects",
                onClick: () => router.push("/projects"),
                variant: "primary",
              },
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* IMPORTANT: flex column + min-h-screen keeps footer reachable */}
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col min-h-screen">
        {/* ───────────────── Header (shrink-0) ───────────────── */}
        <div className="mb-8 flex items-start justify-between gap-6 shrink-0">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-gray-500">Project</div>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                {project.name}
              </h1>
              {project.role && (
                <span className="inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700">
                  {project.role}
                </span>
              )}
            </div>
            {project.description ? (
              <p className="mt-2 text-sm text-gray-600">{project.description}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-400 italic">No description.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              ← Back
            </button>

            <button
              onClick={() => router.push("/projects")}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              All Projects
            </button>

            <button
              onClick={() => router.push(`/tasks/create?project=${project.id}`)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
              type="button"
            >
              + New Task
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              type="button"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* ───────────────── Summary Panel (shrink-0) ───────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm shrink-0">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Overview</div>
          </div>

          <div className="p-6">
            <ProjectSummaryCards
              totalCount={insights.totalCount}
              doneCount={insights.doneCount}
              activeStart={insights.activeStart}
              activeEnd={insights.activeEnd}
              lastActivity={insights.lastActivity}
              remainingPreview={insights.remainingPreview}
              remainingCount={insights.remainingCount}
              remainingOverflow={insights.remainingOverflow}
            />
          </div>
        </div>

        {/* ───────────────── Timelines (flex-1, scroll lives inside panels) ───────────────── */}
        {/* min-h-0 is the magic spell that makes overflow work inside flex/grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Meetings */}
          <div className="lg:col-span-5 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">Upcoming Meetings</div>
              <div className="text-xs text-gray-500">{insights.meetings.length} upcoming</div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto [scrollbar-gutter:stable] p-6">
              <ProjectTimelineSection
                emptyText="No upcoming meetings for this project."
                grouped={insights.meetingsGrouped}
                iconFor={() => "🗓️"}
                metaFor={(t: any) => taskDay(t)}
                onItemClick={(t: any) => router.push(`/tasks?date=${taskDay(t)}`)}
              />
            </div>
          </div>

          {/* Work */}
          <div className="lg:col-span-7 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-gray-500">Work</div>
              <div className="text-xs text-gray-500">
                {insights.workTotal} total • {insights.workDone} done • {insights.workOpen} open
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto [scrollbar-gutter:stable] p-6">
              <ProjectTimelineSection
                emptyText="No work items logged for this project."
                grouped={insights.workGrouped}
                iconFor={(t: any) => (t.is_done ? "☑" : "☐")}
                titleClassFor={(t: any) =>
                  t.is_done ? "text-gray-500 line-through" : "text-gray-900"
                }
                metaFor={(t: any) => (
                  <>
                    {taskDay(t)}
                    {t.priority ? ` • ${String(t.priority).toUpperCase()}` : ""}
                  </>
                )}
                onItemClick={(t: any) => router.push(`/tasks?date=${taskDay(t)}`)}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectShowPage;