import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Task } from 'types/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchTasksByDateRange: (begin: string, end: string) => Promise<void>;
  toggleTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!loggedIn) return;
      setIsLoading(true);
      setError(null);
    try {
      const res = await fetch(`${API_URL}/tasks/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message || 'unknown error')
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasksByDateRange = useCallback(async (begin: string, end: string) => {
    if (!loggedIn) return;
      setIsLoading(true);
      setError(null);
    try {
      const res = await fetch(`${API_URL}/tasks?begin_date=${begin}&end_date=${end}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch tasks by date range');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message || 'unknown error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, getAuthHeaders]);

  const toggleTaskDone = async (taskId: number, isDone: boolean) => {
    if (!loggedIn) return;
    setError(null)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ is_done: !isDone }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updated } : t)));
      }
    } catch (err) {
      setError(err.message || 'unknown error')
      console.error(err);
    }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(task),
    });
    fetchTasks();
  };

  const updateTask = async (task: Task) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(task),
    });
    fetchTasks();
  };

  const deleteTask = async (id: number) => {
    if (!loggedIn) return;
    await fetch(`${API_URL}/tasks/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    fetchTasks();
  };

  useEffect(() => {
    if (loggedIn) fetchTasks();
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
        error
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};
