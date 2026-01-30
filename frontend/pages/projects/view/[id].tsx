import React from 'react';
import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';
import Spinner from 'components/shared/Spinner';

function groupByBeginDate(tasks: any[]) {
  const groups: Record<string, any[]> = {};

  for (const t of tasks || []) {
    const day = (t.begin_date ?? '—').slice(0, 10);
    groups[day] = groups[day] || [];
    groups[day].push(t);
  }

  // newest day first
  const sortedDays = Object.keys(groups).sort().reverse();

  return { groups, sortedDays };
}

function isMeetingTask(t: any) {
  const c = String(t.category ?? '').trim().toLowerCase();
  return c === 'meeting' || c === 'meetings';
}

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

  function taskDay(t: any) {
    return (t.begin_date ?? '').slice(0, 10);
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          <span className="font-bold">Project: </span> {project.name}
        </h1>
        <div className="mb-6 rounded-lg border bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600">
                Progress: <span className="font-medium text-gray-900">{doneCount}</span> / {totalCount} done
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Active days: {activeStart} – {activeEnd} • Last activity: {lastActivity}
              </div>
            </div>

            <div className="text-sm font-medium text-gray-700">
              {progressPct}%
            </div>
          </div>

          <div className="mt-3 h-2 w-full rounded bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mb-8 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">What’s left</h3>
            <div className="text-xs text-gray-500">{remainingCount} open</div>
          </div>

          {remainingCount === 0 ? (
            <div className="mt-3 text-sm text-gray-500">All caught up 🎉</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {remainingPreview.map((t: any) => (
                <li key={t.id} className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg leading-none">☐</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {String(t.begin_date ?? '').slice(0, 10) || '—'}
                      {t.priority ? ` • ${String(t.priority).toUpperCase()}` : ''}
                    </div>
                  </div>
                </li>
              ))}

              {remainingOverflow > 0 && (
                <li className="text-xs text-gray-500 pt-1">
                  +{remainingOverflow} more
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="mt-6 space-y-10">
          {/* MEETINGS */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-bold tracking-widest text-gray-500">MEETINGS</h2>
              <div className="text-xs text-gray-400">{meetingsCount} total</div>
            </div>

            {meetingsGrouped.sortedDays.length === 0 ? (
              <div className="text-sm text-gray-500 rounded border bg-white px-4 py-3">
                No meetings logged for this project.
              </div>
            ) : (
              <div className="space-y-6">
                {meetingsGrouped.sortedDays.map((day) => (
                  <div key={`m-${day}`}>
                    <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-2">{day}</h3>
                    <div className="rounded border bg-white">
                      <ul>
                        {meetingsGrouped.groups[day].map((t: any) => (
                          <li key={t.id} className="border-b last:border-b-0 px-4 py-3 flex items-start gap-3">
                            <button
                              onClick={() => router.push(`/tasks?date=${taskDay(t)}`)}
                              className="flex items-start gap-3 w-full text-left hover:bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="mt-0.5 text-lg leading-none">🗓️</span>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900">{t.title}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {taskDay(t)}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* WORK */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-bold tracking-widest text-gray-500">WORK</h2>
              <div className="text-xs text-gray-400">
                {workTotal} total • {workDone} done • {workOpen} open
              </div>
            </div>

            {workGrouped.sortedDays.length === 0 ? (
              <div className="text-sm text-gray-500 rounded border bg-white px-4 py-3">
                No work items logged for this project.
              </div>
            ) : (
              <div className="space-y-6">
                {workGrouped.sortedDays.map((day) => (
                  <div key={`w-${day}`}>
                    <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-2">{day}</h3>
                    <div className="rounded border bg-white">
                      <ul>
                        {workGrouped.groups[day].map((t: any) => (
                          <li key={t.id} className="border-b last:border-b-0 px-4 py-3 flex items-start gap-3">
                            <button
                              onClick={() => router.push(`/tasks?date=${taskDay(t)}`)}
                              className="flex items-start gap-3 w-full text-left hover:bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="mt-0.5 text-lg leading-none">{t.is_done ? '☑' : '☐'}</span>
                              <div className="min-w-0">
                                <div className={`font-medium ${t.is_done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {t.title}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {taskDay(t)}
                                  {t.priority ? ` • ${String(t.priority).toUpperCase()}` : ''}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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