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

  const { groups, sortedDays } = groupByBeginDate(project.tasks);

  return (
    <div className="min-h-screen flex justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          <span className="font-bold">Name:</span> {project.name}
        </h1>
        <div className="mt-6 space-y-6">
          {sortedDays.map((day) => (
            <div key={day}>
              <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">
                {day}
              </h2>

              <div className="rounded border bg-white">
                <ul>
                  {groups[day].map((t) => (
                    <li key={t.id} className="border-b last:border-b-0 px-4 py-3 flex items-start gap-3">
                      <span className="mt-0.5 text-lg leading-none">
                        {t.is_done ? '☑' : '☐'}
                      </span>

                      <div className="min-w-0">
                        <div className={`font-medium ${t.is_done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {t.title}
                        </div>

                        {/* optional tiny metadata line */}
                        <div className="text-xs text-gray-500 mt-1">
                          {t.priority ? String(t.priority).toUpperCase() : '—'}
                          {t.category ? ` • ${t.category}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
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