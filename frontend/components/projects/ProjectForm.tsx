import { useState } from 'react';

export default function ProjectForm({ initialProject, onSubmit, submitLabel = "Save" }) {
  const [project, setProject] = useState(initialProject);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(project);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input name="name" value={project.name} onChange={handleChange} required />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}