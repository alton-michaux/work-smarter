import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Task, CursorPage } from 'types/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Filters = {
  // optional server-side filters that your API supports
  search?: string;
  project?: number;
  is_done?: boolean;
  priority?: string;
  ordering?: string;     // should match your CursorPagination.ordering (e.g. "-begin_date")
  begin_date?: string;   // if your API accepts these as query params
  end_date?: string;     // (you previously used begin_date/end_date)
};

type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTasks: () => Promise<void>; // kept for compatibility (loads first page with default ordering)
  fetchTasksByDateRange: (begin: string, end: string) => Promise<void>;
  toggleTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;

  // NEW: cursor pagination controls
  nextUrl: string | null;
  previousUrl: string | null;
  resetAndFetch: (filters?: Filters) => Promise<void>;
  loadMore: () => Promise<void>;
  loadPrevious: () => Promise<void>;
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

  // NEW: cursor state
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [params, setParams] = useState<Filters>({ ordering: '-begin_date' });
  const inFlight = useRef<string | null>(null); // avoids duplicate fetches for same URL

  // Memoize headers (uses your APIContext)
  const authHeaders = useMemo(() => getAuthHeaders(), [getAuthHeaders]);

  // --- Cursor helpers ---
  const buildInitialUrl = (filters: Filters = params) => {
    const qs = new URLSearchParams();
    if (filters.search) qs.set('search', filters.search);
    if (filters.project !== undefined) qs.set('project', String(filters.project));
    if (filters.is_done !== undefined) qs.set('is_done', String(filters.is_done));
    if (filters.priority) qs.set('priority', filters.priority);
    if (filters.ordering) qs.set('ordering', filters.ordering);

    // keep compatibility with your prior date range params
    if (filters.begin_date) qs.set('begin_date', filters.begin_date);
    if (filters.end_date) qs.set('end_date', filters.end_date);

    // NOTE: backend must be a CursorPagination endpoint
    return `${API_URL}/tasks/?${qs.toString()}`;
  };

  const fetchUrl = async (url: string, mode: 'reset' | 'append' | 'prepend') => {
    if (!loggedIn) return;
    if (inFlight.current === url) return;
    inFlight.current = url;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: authHeaders });

      if (res.status === 401) {
        setError('Unauthorized');
        setNextUrl(null);      // stop infinite load attempts
        setPreviousUrl(null);
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data: CursorPage<Task> = await res.json();
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
      setTasks(prev => mode === 'reset' ? data.results
                    : mode === 'append' ? [...prev, ...data.results]
                    : [...data.results, ...prev]);
    } catch (e: any) {
      setError(e.message ?? 'unknown error');
    } finally {
      setIsLoading(false);
      inFlight.current = null;
    }
  };

  // Shallow compare to avoid param-churn loops
  const sameParams = (a?: Filters, b?: Filters) =>
    JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

  // Public API: reset and load first page with (optional) filters
  const resetAndFetch = useCallback(async (filters?: Filters) => {
    if (!loggedIn) return;

    const nextParams = filters ?? params;

    // Avoid resetting state if params didn't change
    if (!sameParams(nextParams, params)) {
      setParams(nextParams);
      setTasks([]);
      setNextUrl(null);
      setPreviousUrl(null);
    }

    const url = buildInitialUrl(nextParams);
    await fetchUrl(url, 'reset');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]); // ← don't depend on `params`

  const loadMore = useCallback(async () => {
    if (!loggedIn || !nextUrl) return;
    await fetchUrl(nextUrl, 'append');
  }, [loggedIn, nextUrl]);

  const loadPrevious = useCallback(async () => {
    if (!loggedIn || !previousUrl) return;
    await fetchUrl(previousUrl, 'prepend');
  }, [loggedIn, previousUrl]);

  // --- Your existing functions, now cursor-aware ---

  // Keep this signature; it now just loads the first cursor page with default ordering
  const fetchTasks = async () => {
    await resetAndFetch({ ordering: '-begin_date' });
  };

  // Keep your date-range method, but route through cursor “reset”
  const fetchTasksByDateRange = useCallback(async (begin: string, end: string) => {
    await resetAndFetch({ ...params, begin_date: begin, end_date: end });
  }, [resetAndFetch, params]);

  const toggleTaskDone = async (taskId: number, isDone: boolean) => {
    if (!loggedIn) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ is_done: !isDone }),
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

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(task),
    });
    // Reload first page so cursors are fresh
    await fetchTasks();
  };

  const updateTask = async (task: Task) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(task),
    });
    await fetchTasks();
  };

  const deleteTask = async (id: number) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/${id}/`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    await fetchTasks();
  };

  // Load initial page when user logs in
  useEffect(() => {
    if (loggedIn) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        setTasks,
        addTask,
        updateTask,
        deleteTask,
        fetchTasks,
        fetchTasksByDateRange,
        toggleTaskDone,
        isLoading,
        error,
        nextUrl,
        previousUrl,
        resetAndFetch,
        loadMore,
        loadPrevious,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
