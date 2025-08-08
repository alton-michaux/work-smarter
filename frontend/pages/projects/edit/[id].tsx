import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';
import ProjectForm from '../../../components/projects/ProjectForm';
import Spinner from 'components/shared/Spinner';

export default function ProjectEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { projects, updateProject, isLoading } = useProjects();

  const project = projects.find(p => p.id === Number(id));
  if (!project) return <div>Project not found</div>;

  const handleUpdate = async (updatedProject) => {
    await updateProject({ ...updatedProject, id: Number(id) });
    router.push(`/projects/view/${id}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Edit Project</h1>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <ProjectForm initialProject={project} onSubmit={handleUpdate} submitLabel="Update" />
      )}
      <button className="text-gray-500 text-sm hover:underline" onClick={() => router.push(`/projects/view/${id}`)} style={{ marginTop: 12 }}>Cancel</button>
    </div>
  );
}