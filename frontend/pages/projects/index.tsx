import { useProjects } from '../../context/ProjectsContext';
import { useRouter } from 'next/router';

const ProjectsPage = () => {
  const { projects } = useProjects();
  const router = useRouter();

  const handleProjectClick = (id: number) => {
    router.push(`/projects/view/${id}`);
  };

  return (
    <div>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <a
                href="#"
                style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                onClick={e => {
                  e.preventDefault();
                  handleProjectClick(project.id);
                }}
              >
                {project.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => router.back()}>Back</button>
      <button onClick={() => router.push('/')}>Home</button>
    </div>
  );
};

export default ProjectsPage;