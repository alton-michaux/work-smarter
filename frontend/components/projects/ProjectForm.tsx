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
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white p-6 rounded-lg shadow space-y-4"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Project Name
        </label>
        <input
          id="name"
          name="name"
          value={project.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
      >
        {submitLabel}
      </button>
    </form>
  );
}