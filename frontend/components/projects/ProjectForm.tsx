import { useState } from 'react';
import Button from "../ui/button";
import { useRouter } from "next/router";

export default function ProjectForm({ initialProject, onSubmit, submitLabel = "Save", user }) {
  const [project, setProject] = useState(initialProject);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');
  
  const router = useRouter()

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject(p => ({ ...p, [name]: value, user: user?.id }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    try {
      onSubmit(project);
    } catch (err: any) {
      // This is where we’ll later map backend errors -> field errors
      setFormError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleBack = () => {
    router.back()
  }

  const validate = () => {
    const next: Record<string, string> = {};

    if (!project.name?.trim()) next.title = 'Name is required.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white p-6 rounded-lg shadow space-y-4"
    >
      {formError ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-2">
          {formError}
        </div>
      ) : null}
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
        {errors.name ? (
          <p className="text-sm text-red-600 mt-1">{errors.name}</p>
        ) : null}
        {/* Hidden userId field with associated (hidden) label */}
        <label
          htmlFor="user"
          className="sr-only"
        >
          User
        </label>
        <input
          id="user"
          type="hidden"
          name="user"
          required
          value={user?.id}
        />
      </div>

      <div className="sticky bottom-0 -mx-6 mt-8 border-t border-gray-200 bg-white/90 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="primary"
            size="md"
            type="submit"
          >
            {submitLabel}
          </Button>

          <Button
            variant="ghost"
            onClick={() => handleBack()}
            type="button"
            size="md"
          >
            ← Back
          </Button>
        </div>
      </div>
    </form>
  );
}