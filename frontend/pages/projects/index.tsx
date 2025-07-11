import { useProjects } from '../../context/ProjectsContext';
import { useRouter } from 'next/router';

const ProjectsPage = () => {
  const { projects, deleteProject } = useProjects();
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
    <div>
      <h1>Projects</h1>
      <button onClick={() => router.push('/projects/create')}>Create New Project</button>
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
              <button onClick={() => handleEdit(project.id)} style={{ marginLeft: 8 }}>Edit</button>
              <button onClick={() => handleDelete(project.id)} style={{ color: 'red', marginLeft: 8 }}>Delete</button>
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