import { useRouter } from 'next/router';
import { useProjects } from '../../../context/ProjectsContext';

const ProjectShowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { projects } = useProjects();

  // Find the project by id (id from router.query is a string)
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
      <h1>Project Details</h1>
      <ul>
        <li><strong>Name:</strong> {project.name}</li>
        <li>Tasks: {project.tasks.map((task) => (
          <li> {task.title} </li>
        ))}
        </li>
      </ul>
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/projects')}>All Projects</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default ProjectShowPage;