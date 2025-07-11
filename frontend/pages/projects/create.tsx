import { useRouter } from 'next/router';
import { useProjects } from '../../context/ProjectsContext';
import ProjectForm from '../../components/projects/ProjectForm';

const emptyProject = { name: '' };

export default function ProjectCreatePage() {
  const router = useRouter();
  const { addProject } = useProjects();

  const handleCreate = async (project) => {
    await addProject(project);
    router.push('/projects');
  };

  return (
    <div>
      <h1>Create Project</h1>
      <ProjectForm initialProject={emptyProject} onSubmit={handleCreate} submitLabel="Create" />
      <button onClick={() => router.back()} style={{ marginTop: 12 }}>Back</button>
    </div>
  );
}