import { useProjects } from '../../context/ProjectsContext';
import { useRouter } from 'next/router';
import Spinner from 'components/shared/Spinner';

const ProjectsPage = () => {
  const { projects, deleteProject, isLoading } = useProjects(); // Add isLoading
  const router = useRouter();

  const handleProjectClick = (id: number) => {
    router.push(`/projects/view/${id}`);
  };

  const handleEdit = (id: number) => {
    router.push(`/projects/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Projects</h1>

        <div className="mb-6 text-center">
          <button
            onClick={() => router.push('/projects/create')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            + Create New Project
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-gray-600 text-center">No projects found.</p>
        ) : (
          <ul className="space-y-4">
            {projects.map((project: any) => (
              <li
                key={project.id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleProjectClick(project.id)}
                    className="text-blue-600 hover:underline text-left"
                  >
                    {project.name}
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(project.id)}
                    className="text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;