import { useState } from 'react';
import Button from "../ui/button";
import { useRouter } from "next/router";

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f97316', '#84cc16', '#14b8a6', '#6366f1',
];

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
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={project.description ?? ''}
          onChange={handleChange}
          rows={3}
          placeholder="Optional project description…"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={project.status ?? 'active'}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="active">Active</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setProject(p => ({ ...p, color: c }))}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: project.color === c ? '#1f2937' : 'transparent',
              }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={project.color ?? '#3b82f6'}
            onChange={(e) => setProject(p => ({ ...p, color: e.target.value }))}
            className="w-6 h-6 rounded cursor-pointer border border-gray-300"
            title="Custom color"
          />
        </div>
      </div>

      <div>
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