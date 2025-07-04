import React, { createContext, useState, useContext, ReactNode } from 'react';

type Task = {
  id: number;
  title: string;
  // Add other fields as needed
};

type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within a TasksProvider');
  return context;
};

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  return (
    <TasksContext.Provider value={{ tasks, setTasks }}>
      {children}
    </TasksContext.Provider>
  );
};