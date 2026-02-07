import React from 'react';
import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';
import Spinner from 'components/shared/Spinner';
import { taskDay } from '../../../lib/projectInsights';
import ProjectTimelineSection from '../../../components/projects/projectTimeline';
import ProjectSummaryCards from 'components/projects/ProjectSummaryCards';
import EmptyStateCard from 'components/shared/EmptyStateCard';
import { useProjectInsights } from '../../../hooks/useProjectInsights';

const ProjectShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { projects, isLoading } = useProjects();

  const list = Array.isArray(projects)
    ? projects
    : ((projects as any)?.results ?? []);

  const project = list.find((p) => p.id === Number(id));
  const insights = useProjectInsights(project);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyStateCard
        title="Project Not Found"
        actions={[
          { label: 'Back', onClick: () => router.back(), variant: 'secondary' },
          { label: 'All Projects', onClick: () => router.push('/projects'), variant: 'primary' },
        ]}
      />
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          <span className="font-bold">Project: </span> {project.name}
        </h1>
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

        <div className="mt-6 mb-6 space-y-10">
          {/* MEETINGS/WORK */}
          <div className="mt-6 space-y-10">
            <ProjectTimelineSection
              title="MEETINGS"
              summaryRight={`${insights.meetings.length} total`}
              emptyText="No meetings logged for this project."
              grouped={insights.meetingsGrouped}
              iconFor={() => '🗓️'}
              metaFor={(t: any) => taskDay(t)}
              onItemClick={(t: any) => router.push(`/tasks?date=${taskDay(t)}`)}
            />

            <ProjectTimelineSection
              title="WORK"
              summaryRight={`${insights.workTotal} total • ${insights.workDone} done • ${insights.workOpen} open`}
              emptyText="No work items logged for this project."
              grouped={insights.workGrouped}
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