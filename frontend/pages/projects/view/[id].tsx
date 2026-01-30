import React from 'react';
import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';
import Spinner from 'components/shared/Spinner';
import { groupByBeginDate, isMeetingTask, taskDay } from '../../../lib/projectInsights';
import ProjectTimelineSection from '../../../components/projects/projectTimeline';
import ProjectSummaryCards from 'components/projects/ProjectSummaryCards';

const ProjectShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { projects, isLoading } = useProjects();

  const list = Array.isArray(projects)
    ? projects
    : ((projects as any)?.results ?? []); // <-- if paginated response

  const project = list.find((p) => p.id === Number(id));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Project Not Found</h1>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Back
            </button>
            <button
              onClick={() => router.push('/projects')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              All Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const meetings = (project.tasks ?? []).filter(isMeetingTask);
  const work = (project.tasks ?? []).filter((t: any) => !isMeetingTask(t));

  const meetingsGrouped = groupByBeginDate(meetings);
  const workGrouped = groupByBeginDate(work);

  const totalCount = project.tasks?.length ?? 0;
  const doneCount = project.tasks?.filter((t: any) => t.is_done)?.length ?? 0;

  const allDays = Array.from(
    new Set([
      ...(meetingsGrouped.sortedDays ?? []),
      ...(workGrouped.sortedDays ?? []),
    ])
  ).sort().reverse();

  const activeStart = allDays.length ? allDays[allDays.length - 1] : '—'; // oldest
  const activeEnd = allDays.length ? allDays[0] : '—'; // newest
  const lastActivity = activeEnd;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const remainingWork = work
    .filter((t: any) => !t.is_done)
    .sort((a: any, b: any) => String(a.begin_date ?? '').localeCompare(String(b.begin_date ?? '')));

  const remainingCount = remainingWork.length;

  // Optional: show only top N to keep it clean
  const REMAINING_LIMIT = 6;
  const remainingPreview = remainingWork.slice(0, REMAINING_LIMIT);
  const remainingOverflow = Math.max(0, remainingCount - remainingPreview.length);

  const meetingsCount = meetings.length;

  const workTotal = work.length;
  const workDone = work.filter((t: any) => t.is_done).length;
  const workOpen = workTotal - workDone;

  return (
    <div className="min-h-screen flex justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          <span className="font-bold">Project: </span> {project.name}
        </h1>
        <ProjectSummaryCards
          totalCount={totalCount}
          doneCount={doneCount}
          activeStart={activeStart}
          activeEnd={activeEnd}
          lastActivity={lastActivity}
          remainingPreview={remainingPreview}
          remainingCount={remainingCount}
          remainingOverflow={remainingOverflow}
        />

        <div className="mt-6 space-y-10">
          {/* MEETINGS/WORK */}
          <div className="mt-6 space-y-10">
            <ProjectTimelineSection
              title="MEETINGS"
              summaryRight={`${meetings.length} total`}
              emptyText="No meetings logged for this project."
              grouped={meetingsGrouped}
              iconFor={() => '🗓️'}
              metaFor={(t: any) => taskDay(t)}
              onItemClick={(t: any) => router.push(`/tasks?date=${taskDay(t)}`)}
            />

            <ProjectTimelineSection
              title="WORK"
              summaryRight={`${workTotal} total • ${workDone} done • ${workOpen} open`}
              emptyText="No work items logged for this project."
              grouped={workGrouped}
              iconFor={(t: any) => (t.is_done ? '☑' : '☐')}
              titleClassFor={(t: any) => (t.is_done ? 'text-gray-500 line-through' : 'text-gray-900')}
              metaFor={(t: any) => (
                <>
                  {taskDay(t)}
                  {t.priority ? ` • ${String(t.priority).toUpperCase()}` : ''}
                </>
              )}
              onItemClick={(t: any) => router.push(`/tasks?date=${taskDay(t)}`)}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            All Projects
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectShowPage;