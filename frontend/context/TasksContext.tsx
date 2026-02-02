import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Task } from 'types/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Filters = {
  search?: string;
  project?: number;
  is_done?: boolean;
  priority?: string;
  ordering?: string;
  begin_date?: string;
  end_date?: string;
  active_on?: string;
};

type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTaskAndReload: (task: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchTasksByDateRange: (begin: string, end: string, active_on: string) => Promise<void>;
  toggleTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

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

  const fetchTasksByDateRange = useCallback(async (begin: string, end: string, active_on: string) => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = buildUrl({ ordering: '-begin_date', begin_date: begin, end_date: end, active_on });
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

      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
      throw err;
    }
  };

  const updateTaskAndReload = async (task: Task) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(task),
    });
    await fetchTasks();
  };

  const deleteTask = async (id: number) => {
    if (!loggedIn) return;

    const numericId = Number(id);
    
    const res = await fetch(`${API_URL}/tasks/${numericId}/`, { 
      method: "DELETE", 
      headers: getAuthHeaders() 
    });

    if (!res.ok) throw new Error("Delete failed");

    setTasks(prev => prev.filter(t => t.id !== numericId));
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        setTasks,
        addTask,
        updateTaskAndReload,
        deleteTask,
        fetchTasks,
        fetchTasksByDateRange,
        toggleTaskDone,
        isLoading,
        error,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
