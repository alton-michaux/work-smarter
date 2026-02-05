import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { RecurrenceState, ProjectOption, TaskFormProps } from "types/types";
import { useTasks } from "../../context/TasksContext";

export default function TaskForm({
  initialTask,
  onSubmit,
  submitLabel = "Save",
  projects,
}: TaskFormProps) {
  const { user, getAuthHeaders } = useAuth();

  const [task, setTask] = useState<any>(() => ({
    ...initialTask,
    user: user?.id || initialTask?.user,
  }));

  const [recurrence, setRecurrence] = useState<RecurrenceState>(() => ({
    repeats: false,
    frequency: "weekly",
    day_of_week: 0,
    start_date: initialTask?.begin_date || "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");

  const isEditing = Boolean(initialTask?.id);

  const { fetchRecurringTemplate } = useTasks()

  const recurringTemplateId = useMemo(() => {
    // prefer recurring_task_id from serializer
    if (initialTask?.recurring_task_id) return initialTask.recurring_task_id;

    // handle recurring_task as id number
    if (typeof initialTask?.recurring_task === "number") return initialTask.recurring_task;

    // handle recurring_task as nested object
    if (typeof initialTask?.recurring_task === "object" && initialTask?.recurring_task?.id) {
      return initialTask.recurring_task.id;
    }

    return null;
  }, [initialTask]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setTask((t: any) => ({
      ...t,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!task.title?.trim()) next.title = "Title is required.";
    if (!String(task.category ?? "").trim()) next.category = "Category is required.";
    if (!String(task.priority ?? "").trim()) next.priority = "Priority is required.";

    // Your backend requires begin_date
    if (!task.begin_date) next.begin_date = "Date is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload: any = {
      id: task.id, // harmless on create; useful on edit
      title: task.title,
      category: task.category,
      priority: task.priority,
      description: task.description ?? "",
      begin_date: task.begin_date,
      end_date: task.end_date ?? null,
      project: task.project === "" ? null : task.project ?? null,
      is_done: !!task.is_done,
      is_subtask: !!task.is_subtask,
      carry_over: !!task.carry_over,
      user: task.user,
      ...(recurrence.repeats ? { recurrence } : {}),
    };

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setFormError(err?.message || "Something went wrong. Please try again.");
    }
  };

  // Keep task in sync when initialTask arrives (edit pages often load async)
  useEffect(() => {
    setTask((prev: any) => ({
      ...prev,
      ...initialTask,
      user: user?.id || initialTask?.user,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTask?.id, user?.id]);

  // ✅ HYDRATE RECURRENCE STATE ON EDIT
  useEffect(() => {
    if (!isEditing) return;

    const rtObj =
      typeof initialTask?.recurring_task === "object" ? initialTask.recurring_task : null;

    const hasRecurring = Boolean(recurringTemplateId);

    // 1) If we have the nested object, hydrate immediately
    if (rtObj?.frequency) {
      setRecurrence((prev) => ({
        ...prev,
        repeats: hasRecurring,
        frequency: rtObj.frequency ?? prev.frequency,
        day_of_week: rtObj.day_of_week ?? prev.day_of_week,
        start_date: rtObj.start_date ?? initialTask?.begin_date ?? prev.start_date,
      }));
      return;
    }

    // 2) If we only have the id, at least check repeats,
    // then fetch template details so dropdown is prefilled.
    if (hasRecurring) {
      setRecurrence((prev) => ({
        ...prev,
        repeats: true,
        start_date: prev.start_date || initialTask?.begin_date || "",
      }));

      fetchRecurringTemplate(recurringTemplateId, initialTask, setRecurrence)
    }
  }, [isEditing, recurringTemplateId, initialTask, getAuthHeaders]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
      {formError ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-2">
          {formError}
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          name="title"
          value={task.title ?? ""}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.title ? <p className="text-sm text-red-600 mt-1">{errors.title}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          name="category"
          value={task.category ?? ""}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">— Select —</option>
          <option value="Task">Task</option>
          <option value="Meetings">Meeting</option>
          <option value="Notes">Note</option>
        </select>
        {errors.category ? <p className="text-sm text-red-600 mt-1">{errors.category}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          name="priority"
          value={task.priority ?? ""}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">— Select —</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {errors.priority ? <p className="text-sm text-red-600 mt-1">{errors.priority}</p> : null}
      </div>

      {/* BEGIN DATE (required) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          name="begin_date"
          value={task.begin_date ?? ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded"
        />
        {errors.begin_date ? <p className="text-sm text-red-600 mt-1">{errors.begin_date}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          value={task.description ?? ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" name="is_done" checked={!!task.is_done} onChange={handleChange} className="h-4 w-4 text-green-600" />
          <span>Done</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" name="is_subtask" checked={!!task.is_subtask} onChange={handleChange} className="h-4 w-4 text-green-600" />
          <span>Is Subtask</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" name="carry_over" checked={!!task.carry_over} onChange={handleChange} className="h-4 w-4 text-green-600" />
          <span>Carry Over</span>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Project</span>
        <select
          name="project"
          value={task.project ?? ""}
          onChange={(e) =>
            setTask((prev: any) => ({
              ...prev,
              project: e.target.value === "" ? "" : Number(e.target.value),
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

      {/* RECURRENCE */}
      <div className="border rounded p-3 space-y-3">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={recurrence.repeats}
            onChange={(e) => setRecurrence((r) => ({ ...r, repeats: e.target.checked }))}
            className="h-4 w-4 text-green-600"
          />
          <span>Repeats</span>
        </label>

        {recurrence.repeats && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={recurrence.frequency}
                onChange={(e) => setRecurrence((r) => ({ ...r, frequency: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {recurrence.frequency === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of week</label>
                <select
                  value={recurrence.day_of_week}
                  onChange={(e) => setRecurrence((r) => ({ ...r, day_of_week: Number(e.target.value) }))}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={recurrence.start_date ?? ""}
                onChange={(e) => setRecurrence((r) => ({ ...r, start_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
            </div>
          </>
        )}
      </div>

      <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
        {submitLabel}
      </button>
    </form>
  );
}
