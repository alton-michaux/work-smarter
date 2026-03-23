import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Task, Filters, TasksContextType, CreateTaskPayload, DeleteTaskOptions } from 'types/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = (filters: Filters = { ordering: '-begin_date' }) => {
    const qs = new URLSearchParams();
    if (filters.search) qs.set('search', filters.search);
    if (filters.project !== undefined) qs.set('project', String(filters.project));
    if (filters.is_done !== undefined) qs.set('is_done', String(filters.is_done));
    if (filters.priority) qs.set('priority', filters.priority);
    if (filters.ordering) qs.set('ordering', filters.ordering);
    if (filters.begin_date) qs.set('begin_date', filters.begin_date);
    if (filters.end_date) qs.set('end_date', filters.end_date);
    if (filters.active_on) qs.set('active_on', filters.active_on);
    return `${API_URL}/tasks/?${qs.toString()}`;
  };

  const fetchTasks = useCallback(async () => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = buildUrl({ ordering: '-begin_date' });
      const res = await fetch(url, { headers: getAuthHeaders() });

      if (res.status === 401) {
        setError('Unauthorized');
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data = await res.json();
      setTasks(data.results || []);
    } catch (e: any) {
      setError(e.message ?? 'unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, getAuthHeaders]);

  const fetchTasksByDateRange = useCallback(
    async (begin: string, end: string, active_on?: string | null) => {
      if (!loggedIn) return;
      setIsLoading(true);
      setError(null);

      try {
        const params: any = { ordering: "-begin_date", begin_date: begin, end_date: end };

        // Only include active_on if it’s a non-empty string
        if (typeof active_on === "string" && active_on.trim().length > 0) {
          params.active_on = active_on;
        }

        const url = buildUrl(params);
        const res = await fetch(url, { headers: getAuthHeaders() });

        if (res.status === 401) {
          setError("Unauthorized");
          return;
        }

        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

        const data = await res.json();
        setTasks(data.results || []);
      } catch (e: any) {
        setError(e.message ?? "unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [loggedIn, getAuthHeaders]
  );

  const fetchRecurringTemplate = async (recurring_task_id: number, initialTask: any, setRecurrence: any) => {
    if (!loggedIn) return;
    setError(null)
    try {
      const res = await fetch(`${API_URL}/recurring-tasks/${recurring_task_id}/`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) return; // silently skip; repeats remains checked

      const rt = await res.json();

      setRecurrence((prev) => ({
        ...prev,
        repeats: true,
        frequency: rt.frequency ?? prev.frequency,
        day_of_week: rt.day_of_week ?? prev.day_of_week,
        start_date: rt.start_date ?? initialTask?.begin_date ?? prev.start_date,
      }));
    } catch (err: any) {
      setError(err.message || 'unknown error');
      console.error(err);
    }
  }

  const toggleTaskDone = async (taskId: number, nextDone: boolean) => {
    if (!loggedIn) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ is_done: nextDone }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updated } : t)));
      }
    } catch (err: any) {
      setError(err.message || 'unknown error');
      console.error(err);
    }
  };

  const addTask = async (task: any) => {
    if (!loggedIn) return;

    try {
      let recurringTaskId: number | null = null;

      // 1) If the user checked "Repeats", create the RecurringTask first
      if (task?.recurrence?.repeats) {
        const payload: any = {
          title: task.title,
          project: task.project === '' ? null : (task.project ?? null),
          category: task.category || null,
          frequency: task.recurrence.frequency,
          start_date: task.recurrence.start_date || task.begin_date,
          is_active: true,
        };

        if (task.recurrence.frequency === 'weekly') {
          payload.day_of_week = task.recurrence.day_of_week;
        }

        const res = await fetch(`${API_URL}/recurring-tasks/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to create recurring task: ${text}`);
        }

        const created = await res.json();
        recurringTaskId = created.id;
      }

      // 2) Build the task payload safely (no accidental recurring fields)
      const taskPayload: any = { ...task };

      // remove UI-only recurrence wrapper
      delete taskPayload.recurrence;

      // IMPORTANT: strip any accidental recurring fields from initialTask / stale state
      delete taskPayload.recurring_task;
      delete taskPayload.recurring_task_id;
      delete taskPayload.is_recurring;

      // normalize project
      if (taskPayload.project === '') taskPayload.project = null;

      // set recurring_task ONLY if we intentionally created a recurring series
      taskPayload.recurring_task = recurringTaskId; // null if not repeating

      // 3) Create the Task row
      const res2 = await fetch(`${API_URL}/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(taskPayload),
      });

      if (!res2.ok) {
        const text = await res2.text();
        throw new Error(`Failed to create task: ${text}`);
      }

      const day = (taskPayload.begin_date ?? "").slice(0, 10);
      if (day) {
        await fetchTasksByDateRange(day, day, day);
      } else {
        await fetchTasks();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
      throw err;
    }
  };

  const addSubtask = async (payload: CreateTaskPayload) => {
    if (!loggedIn) return;

    try {
      const res = await fetch(`${API_URL}/tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          // ✅ force these so backend doesn't complain + keep semantics clear
          recurring_task: null,
          ...payload,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create subtask");
      }

      const day = (payload.begin_date ?? "").slice(0, 10);
      if (day) {
        await fetchTasksByDateRange(day, day, day);
      } else {
        await fetchTasks();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add subtask");
      throw err;
    }
  };

  const updateTaskAndReload = async (task: Task) => {
    if (!loggedIn) return;

    const res = await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(task),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update task: ${text}`);
    }

    const updated = await res.json();

    setTasks((prev) =>
      prev.map((t: any) => (Number(t.id) === Number(updated.id) ? { ...t, ...updated } : t))
    );
  };

  const deleteTask = async (taskOrId: any, options: DeleteTaskOptions = {}) => {
    if (!loggedIn) return;

    const id =
      typeof taskOrId === "number"
        ? taskOrId
        : (taskOrId?.id ?? taskOrId?.task?.id ?? taskOrId?.pk);

    if (!id) {
      // fail loudly with context so we find the call site fast
      console.error("deleteTask called without an id. Argument was:", taskOrId);
      throw new Error("Failed to delete task: missing task id");
    }

    const isRecurring =
      typeof taskOrId === "object" &&
      Boolean(taskOrId?.recurring_task_id || taskOrId?.recurring_task);

    const deleteSeries = Boolean(options.deleteSeries);

    const url =
      isRecurring && deleteSeries
        ? `${API_URL}/tasks/${id}/?delete_series=1`
        : `${API_URL}/tasks/${id}/`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to delete task: ${text}`);
    }

    setTasks((prev) => {
      // If we deleted a whole recurring series, remove all occurrences we have in memory
      const recurringId =
        typeof taskOrId === "object"
          ? (taskOrId?.recurring_task_id ??
            (typeof taskOrId?.recurring_task === "number"
              ? taskOrId.recurring_task
              : taskOrId?.recurring_task?.id) ??
            null)
          : null;

      if (isRecurring && deleteSeries && recurringId) {
        return prev.filter(
          (t: any) => (t.recurring_task_id ?? t.recurring_task) !== recurringId
        );
      }
      // Otherwise delete just the one row
      return prev.filter((t: any) => Number(t.id) !== Number(id));
    });
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        setTasks,
        addTask,
        addSubtask,
        updateTaskAndReload,
        deleteTask,
        fetchTasks,
        fetchTasksByDateRange,
        fetchRecurringTemplate,
        toggleTaskDone,
        isLoading,
        error,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
