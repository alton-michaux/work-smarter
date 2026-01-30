import { useState } from 'react';
import { useAuth } from '../../context/AuthContext'

export default function TaskForm({ initialTask, onSubmit, submitLabel = "Save" }) {
  const { user } = useAuth();
  const [task, setTask] = useState({ ...initialTask, user: user?.id || initialTask.user });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTask(t => ({
      ...t,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(task);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          name="title"
          value={task.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          name="category"
          value={task.category}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <input
          name="priority"
          value={task.priority}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <input
          name="project"
          value={task.project}
          onChange={handleChange}
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
  )
}