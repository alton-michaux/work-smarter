import { useState } from 'react';
import { useAuth } from '../../context/AuthContext'

type ProjectOption = { id: number; name: string };

type TaskFormProps = {
  initialTask: any;
  onSubmit: (task: any) => void;
  submitLabel: string;
  projects?: ProjectOption[];
};

export default function TaskForm({ initialTask, onSubmit, submitLabel = "Save", projects }: TaskFormProps) {
  const { user, getAuthHeaders } = useAuth();
  const [task, setTask] = useState({ ...initialTask, user: user?.id || initialTask.user });

  const [recurrence, setRecurrence] = useState({
    repeats: false,
    frequency: "weekly",      // "daily" | "weekly" | "monthly"
    day_of_week: 0,           // 0=Mon ... 6=Sun
    start_date: initialTask.begin_date || "", // default from task if present
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTask(t => ({
      ...t,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    try {
      await onSubmit({ ...task, recurrence });
    } catch (err: any) {
      // This is where we’ll later map backend errors -> field errors
      setFormError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!task.title?.trim()) next.title = 'Title is required.';
    if (!task.category?.trim()) next.category = 'Category is required.';
    if (!task.priority?.trim()) next.priority = 'Priority is required.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 max-w-xl mx-auto bg-white p-6 rounded-lg shadow"
    >
      {formError ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-2">
          {formError}
        </div>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          name="title"
          value={task.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.title ? (
          <p className="text-sm text-red-600 mt-1">{errors.title}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          name="category"
          value={task.category}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.category ? (
          <p className="text-sm text-red-600 mt-1">{errors.category}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          name="priority"
          value={task.priority ?? ''}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">— Select —</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {errors.priority ? (
          <p className="text-sm text-red-600 mt-1">{errors.priority}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={task.description}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_done"
            checked={task.is_done}
            onChange={handleChange}
            className="h-4 w-4 text-green-600"
          />
          <span>Done</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_subtask"
            checked={task.is_subtask}
            onChange={handleChange}
            className="h-4 w-4 text-green-600"
          />
          <span>Is Subtask</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="carry_over"
            checked={task.carry_over}
            onChange={handleChange}
            className="h-4 w-4 text-green-600"
          />
          <span>Carry Over</span>
        </label>
      </div>

      <div style={{ display: 'none' }}>
        <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
        <input
          name="user"
          value={task.user}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Project</span>

        <select
          name="project"
          value={task.project ?? ''}
          onChange={(e) =>
            setTask((prev: any) => ({
              ...prev,
              project: e.target.value === '' ? '' : Number(e.target.value),
            }))
          }
          className="mt-1 w-full border rounded px-3 py-2"
        >
          <option value="">— None —</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="border rounded p-3 space-y-3">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={recurrence.repeats}
            onChange={(e) =>
              setRecurrence((r) => ({ ...r, repeats: e.target.checked }))
            }
            className="h-4 w-4 text-green-600"
          />
          <span>Repeats</span>
        </label>

        {recurrence.repeats && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={recurrence.frequency}
                onChange={(e) =>
                  setRecurrence((r) => ({ ...r, frequency: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {recurrence.frequency === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of week
                </label>
                <select
                  value={recurrence.day_of_week}
                  onChange={(e) =>
                    setRecurrence((r) => ({ ...r, day_of_week: Number(e.target.value) }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                >
                  <option value={0}>Monday</option>
                  <option value={1}>Tuesday</option>
                  <option value={2}>Wednesday</option>
                  <option value={3}>Thursday</option>
                  <option value={4}>Friday</option>
                  <option value={5}>Saturday</option>
                  <option value={6}>Sunday</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={recurrence.start_date}
                onChange={(e) =>
                  setRecurrence((r) => ({ ...r, start_date: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
      >
        {submitLabel}
      </button>
    </form>
  )
}