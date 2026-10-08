import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { RecurrenceState, Task, TaskFormProps, TaskSubmission } from "types/types";
import { useTasks } from "../../context/TasksContext";
import { useAPI } from "context/APIContext";
import MarkdownEditor from "components/shared/MarkdownEditor";
import EncryptedNoteUnlock from "components/notes/EncryptedNoteUnlock";
import Button from "components/ui/button";
import Link from "next/link";
import { errorMessage } from "lib/errors";

/** The recurring series a task belongs to, if any. */
function recurringTemplateIdOf(
  task: Partial<Pick<Task, "recurring_task" | "recurring_task_id">> | undefined
): number | null {
  const id = task?.recurring_task_id ?? task?.recurring_task;
  return id ? Number(id) : null;
}

export default function TaskForm({
  initialTask,
  onSubmit,
  submitLabel = "Save",
  projects,
}: TaskFormProps) {
  const { user } = useAuth();
  const { isLoading } = useAPI();

  const [task, setTask] = useState<TaskSubmission>(() => ({
    ...initialTask,
    user: user?.id || initialTask?.user,
  }));

  const isEditing = Boolean(initialTask?.id);
  const recurringTemplateId = recurringTemplateIdOf(initialTask);

  const [recurrence, setRecurrence] = useState<RecurrenceState>(() => ({
    // The series' frequency etc. are fetched below; show "Repeats" checked
    // straight away so the section doesn't flicker in.
    repeats: isEditing && Boolean(recurringTemplateId),
    frequency: "weekly",
    day_of_week: 0,
    start_date: initialTask?.begin_date || "",
    skip_weekends: false,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");

  const { fetchRecurringTemplate } = useTasks();

  // Encrypted notes: `task.description` is always "" from the API for a
  // locked note, so editing requires unlocking first via the passphrase the
  // note was encrypted with. That same passphrase is then sent back on
  // submit so the backend can re-encrypt (or decrypt, if turned off).
  const wasEncrypted = Boolean(initialTask?.is_encrypted);
  const [isUnlocked, setIsUnlocked] = useState(!wasEncrypted);
  const [passphrase, setPassphrase] = useState("");

  // Re-seed the form when a different task loads into this instance (the
  // edit page reuses it across ids) or once the user loads. Done during
  // render rather than in an effect so the stale form never paints:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [seededTaskId, setSeededTaskId] = useState(initialTask?.id);
  const [seededUserId, setSeededUserId] = useState(user?.id);
  if (initialTask?.id !== seededTaskId || user?.id !== seededUserId) {
    if (initialTask?.id !== seededTaskId) {
      setIsUnlocked(!initialTask?.is_encrypted);
      setPassphrase("");
    }
    setSeededTaskId(initialTask?.id);
    setSeededUserId(user?.id);
    setTask((prev) => ({
      ...prev,
      ...initialTask,
      user: user?.id || initialTask?.user,
    }));
  }

  const inputClass =
    "w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const selectClass = inputClass;

  const roundToQuarterHour = (timeStr: string): string => {
    if (!timeStr) return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    const rounded = Math.round(m / 15) * 15;
    const finalHour = rounded === 60 ? (h + 1) % 24 : h;
    const finalMin = rounded === 60 ? 0 : rounded;
    return `${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    const isTimeField = name === 'begin_time' || name === 'end_time';
    setTask((t) => ({
      ...t,
      [name]: type === "checkbox" ? checked : (isTimeField ? roundToQuarterHour(value) : value),
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!task.title?.trim()) next.title = "Title is required.";
    if (!String(task.category ?? "").trim()) next.category = "Category is required.";
    if (!String(task.priority ?? "").trim()) next.priority = "Priority is required.";
    if (!task.begin_date) next.begin_date = "Date is required.";

    // A passphrase is only needed when this save actually touches the
    // ciphertext: turning encryption on/off, or editing an unlocked note's
    // content. A locked note's other fields (title, priority, ...) can be
    // saved without ever unlocking it.
    const touchingEncryption =
      (task.is_encrypted && !wasEncrypted) ||
      (wasEncrypted && !task.is_encrypted) ||
      (wasEncrypted && task.is_encrypted && isUnlocked);
    if (touchingEncryption && !passphrase) {
      next.passphrase = "A passphrase is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    const isMeeting = task.category === "meeting";
    const payload: TaskSubmission = {
      id: task.id,
      title: task.title,
      category: task.category,
      priority: task.priority,
      description: task.description ?? "",
      begin_date: task.begin_date,
      end_date: task.end_date ?? null,
      deadline_date: task.deadline_date ?? null,
      begin_time: isMeeting ? (task.begin_time || null) : null,
      end_time: isMeeting ? (task.end_time || null) : null,
      project: task.project === "" ? null : task.project ?? null,
      is_done: !!task.is_done,
      is_subtask: !!task.is_subtask,
      carry_over: !!task.carry_over,
      user: task.user,
      recurring_task: recurringTemplateId,
      ...(recurrence.repeats ? { recurrence } : {}),
      ...(task.category === "note" ? { is_encrypted: !!task.is_encrypted } : {}),
      ...(passphrase ? { passphrase } : {}),
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setFormError(errorMessage(err, "Something went wrong. Please try again."));
    }
  };

  useEffect(() => {
    if (!isEditing || !recurringTemplateId) return;
    fetchRecurringTemplate(recurringTemplateId, initialTask, setRecurrence);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRecurringTemplate isn't memoized; listing it would refetch every render
  }, [isEditing, recurringTemplateId, initialTask]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {formError ? (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 text-red-700 dark:text-red-400 text-sm px-4 py-2">
          {formError}
        </div>
      ) : null}

      {/* Basics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            name="title"
            value={task.title ?? ""}
            onChange={handleChange}
            className={inputClass}
          />
          {errors.title ? <p className="text-sm text-red-600 mt-1">{errors.title}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            name="category"
            value={task.category ?? ""}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="">— Select —</option>
            <option value="task">Task</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
          {errors.category ? <p className="text-sm text-red-600 mt-1">{errors.category}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
          <select
            name="priority"
            value={task.priority ?? ""}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="">— Select —</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {errors.priority ? <p className="text-sm text-red-600 mt-1">{errors.priority}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            name="begin_date"
            value={task.begin_date ?? ""}
            onChange={handleChange}
            className={inputClass}
          />
          {errors.begin_date ? (
            <p className="text-sm text-red-600 mt-1">{errors.begin_date}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deadline <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            name="deadline_date"
            value={task.deadline_date ?? ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {task.category === "meeting" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
              <input
                type="time"
                name="begin_time"
                value={task.begin_time ?? ""}
                onChange={handleChange}
                step={900}
                className={inputClass}
              />
              {!task.begin_time && (
                <p className="mt-1 text-xs text-amber-600">
                  No start time set — meeting won&apos;t appear in time order.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
              <input
                type="time"
                name="end_time"
                value={task.end_time ?? ""}
                onChange={handleChange}
                step={900}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
          <select
            name="project"
            value={task.project ?? ""}
            onChange={(e) =>
              setTask((prev) => ({
                ...prev,
                project: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            className={selectClass}
          >
            <option value="">— None —</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Options */}
      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Options</h2>

        <div className="flex flex-wrap gap-6 justify-around">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="is_done"
              checked={!!task.is_done}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Done
          </label>

          {/* <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_subtask"
              checked={!!task.is_subtask}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Is Subtask
          </label> */}

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="carry_over"
              checked={!!task.carry_over}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Carry Over
          </label>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Markdown supported: lists, checkboxes, code blocks.
          </span>
        </div>

        {wasEncrypted && !isUnlocked ? (
          <EncryptedNoteUnlock
            taskId={initialTask.id}
            onUnlock={(plaintext, unlockPassphrase) => {
              setTask((prev) => ({ ...prev, description: plaintext }));
              setPassphrase(unlockPassphrase);
              setIsUnlocked(true);
            }}
          />
        ) : (
          <>
            {task.category === "note" && (
              <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!task.is_encrypted}
                    onChange={(e) =>
                      setTask((prev) => ({ ...prev, is_encrypted: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Encrypt this note
                </label>

                {(task.is_encrypted || (wasEncrypted && !task.is_encrypted)) && (
                  <div>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Passphrase"
                      className={inputClass}
                    />
                    {errors.passphrase ? (
                      <p className="text-sm text-red-600 mt-1">{errors.passphrase}</p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-600">
                        There is no way to recover this note if you forget the passphrase.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <MarkdownEditor
              value={task.description ?? ""}
              onChange={(next) => setTask((prev) => ({ ...prev, description: next }))}
              placeholder={`### Notes\n- [ ] Follow up\n- [x] Done`}
            />
          </>
        )}
      </div>

      {/* Recurrence */}
      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recurrence</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatically create occurrences on a schedule.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={recurrence.repeats}
              onChange={(e) =>
                setRecurrence((r) => ({ ...r, repeats: e.target.checked }))
              }
              className="h-4 w-4"
            />
            <span className="font-medium text-gray-900 dark:text-gray-100">Repeats</span>
          </label>
        </div>

        {recurrence.repeats ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <select
                value={recurrence.frequency}
                onChange={(e) =>
                  setRecurrence((r) => ({ ...r, frequency: e.target.value as RecurrenceState["frequency"] }))
                }
                className={selectClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {recurrence.frequency === "daily" ? (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                  <input
                    type="checkbox"
                    checked={recurrence.skip_weekends}
                    onChange={(e) =>
                      setRecurrence((r) => ({ ...r, skip_weekends: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  <span>Skip weekends</span>
                </label>
              </div>
            ) : (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of week
                </label>
                <select
                  value={recurrence.day_of_week}
                  onChange={(e) =>
                    setRecurrence((r) => ({
                      ...r,
                      day_of_week: Number(e.target.value),
                    }))
                  }
                  className={selectClass}
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
            ) : (
              <div className="hidden md:block" />
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={recurrence.start_date ?? ""}
                onChange={(e) =>
                  setRecurrence((r) => ({ ...r, start_date: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Turn on <span className="font-medium text-gray-900 dark:text-gray-100">Repeats</span> to set a schedule.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 -mx-6 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/tasks">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>

          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
