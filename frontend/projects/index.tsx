import { useProjects } from '../context/ProjectsContext';
import { useRouter } from 'next/router';

const ProjectsPage = () => {
  const { projects } = useProjects();
  const router = useRouter();

  return (
    <div>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default ProjectsPage;