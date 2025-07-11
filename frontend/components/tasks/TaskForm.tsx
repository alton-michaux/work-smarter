import { useState } from 'react';

export default function TaskForm({ initialTask, onSubmit, submitLabel = "Save" }) {
  const [task, setTask] = useState(initialTask);

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
    <form onSubmit={handleSubmit}>
      <label>
        Title:
        <input name="title" value={task.title} onChange={handleChange} required />
      </label>
      <label>
        Category:
        <input name="category" value={task.category} onChange={handleChange} />
      </label>
      <label>
        Priority:
        <input name="priority" value={task.priority} onChange={handleChange} />
      </label>
      <label>
        Description:
        <textarea name="description" value={task.description} onChange={handleChange} />
      </label>
      <label>
        Done:
        <input type="checkbox" name="is_done" checked={task.is_done} onChange={handleChange} />
      </label>
      <label>
        Is Subtask:
        <input type="checkbox" name="is_subtask" checked={task.is_subtask} onChange={handleChange} />
      </label>
      <label>
        Carry Over:
        <input type="checkbox" name="carry_over" checked={task.carry_over} onChange={handleChange} />
      </label>
      <label>
        User:
        <input name="user" value={task.user} onChange={handleChange} />
      </label>
      <label>
        Project:
        <input name="project" value={task.project} onChange={handleChange} />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}