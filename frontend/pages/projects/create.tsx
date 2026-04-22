import { useRouter } from 'next/router';
import { useProjects } from '../../context/ProjectsContext';
import { useAuth } from 'context/AuthContext';
import ProjectForm from '../../components/projects/ProjectForm';
import Spinner from 'components/shared/Spinner';

const emptyProject = { name: '', user: '', status: 'active' as const, description: '' };

export default function ProjectCreatePage() {
  const router = useRouter();
  const { addProject, isLoading } = useProjects();
  const auth = useAuth();
  const handleCreate = async (project) => {
    await addProject(project);
    router.push('/projects');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">Create Project</h1>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <ProjectForm initialProject={emptyProject} onSubmit={handleCreate} submitLabel="Create" user={auth.user} />
      )}
    </div>
  );
}