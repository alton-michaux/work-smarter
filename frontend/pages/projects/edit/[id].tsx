import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';
import ProjectForm from '../../../components/projects/ProjectForm';

export default function ProjectEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { projects, updateProject } = useProjects();

  const project = projects.find(p => p.id === Number(id));
  if (!project) return <div>Project not found</div>;

  const handleUpdate = async (updatedProject) => {
    await updateProject({ ...updatedProject, id: Number(id) });
    router.push(`/projects/view/${id}`);
  };

  return (
    <div>
      <h1>Edit Project</h1>
      <ProjectForm initialProject={project} onSubmit={handleUpdate} submitLabel="Update" />
      <button onClick={() => router.push(`/projects/view/${id}`)} style={{ marginTop: 12 }}>Cancel</button>
    </div>
  );
}