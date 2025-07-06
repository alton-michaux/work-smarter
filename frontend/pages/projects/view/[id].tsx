import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';

const ProjectShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { projects } = useProjects();

  const project = projects.find(p => p.id === Number(id));

  if (!project) {
    return (
      <div>
        <h1>Project Not Found</h1>
        <button onClick={() => router.back()}>Back</button>
        <button onClick={() => router.push('/projects')}>All Projects</button>
      </div>
    );
  }

  return (
    <div>
      <h1><strong>Name:</strong> {project.name}</h1>
      <ul>
        {project.tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/projects')}>All Projects</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default ProjectShowPage;