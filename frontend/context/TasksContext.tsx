import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Task = {
  id: number;
  title: string;
  category: string;
  is_done: boolean;
  priority: string;
  description: string;
  is_subtask: boolean;
  carry_over: boolean;
  user: number;
  project: number;
};

type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTasks: () => Promise<void>;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch all tasks from backend
  const fetchTasks = async () => {
    const res = await fetch(`${API_URL}/tasks/`);
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    return token
      ? { 'Content-Type': 'application/json', Authorization: `Token ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  // Add a new task
  const addTask = async (task: Omit<Task, 'id'>) => {
    const res = await fetch(`${API_URL}/tasks/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(task),
    });
    const newTask = await res.json();
    setTasks(prev => [...prev, newTask]);
  };

  // Update an existing task
  const updateTask = async (updatedTask: Task) => {
    const res = await fetch(`${API_URL}/tasks/${updatedTask.id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedTask),
    });
    const data = await res.json();
    setTasks(prev => prev.map(t => (t.id === data.id ? data : t)));
  };

  // Delete a task
  const deleteTask = async (id: number) => {
    await fetch(`${API_URL}/tasks/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <TasksContext.Provider value={{ tasks, setTasks, addTask, updateTask, deleteTask, fetchTasks }}>
      {children}
    </TasksContext.Provider>
  );
};