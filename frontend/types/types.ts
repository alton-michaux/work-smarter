// types.ts

export type Task = {
  id: number;
  title: string;
  description?: string;
  is_done: boolean;
  priority: string;
  category: string;
  carry_over?: boolean;
  is_subtask?: boolean;
  project?: number;
  begin_date: string;
  end_date: string;
  recurring_task: Task[];
  user: number;
};

export type RecurrenceState = {
  repeats: boolean;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week: number; // 0=Mon .. 6=Sun
  start_date: string;  // YYYY-MM-DD
};

export type Project = {
  created: Date;
  id: number;
  name: string;
  tasks?: Task[];
  user?: number | User;
};

export type NewProject = {
  name: string;
  user: number;
};

export type ProjectOption = { id: number; name: string };

export type TaskFormProps = {
  initialTask: any;
  onSubmit: (task: any) => void;
  submitLabel: string;
  projects?: ProjectOption[];
};

export type Filters = {
  search?: string;
  project?: number;
  is_done?: boolean;
  priority?: string;
  ordering?: string;
  begin_date?: string;
  end_date?: string;
  active_on?: string;
};

export type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTaskAndReload: (task: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchTasksByDateRange: (begin: string, end: string, active_on: string) => Promise<void>;
  fetchRecurringTemplate: (recurring_task_id: number, initialTask: any, setRecurrence: any) => Promise<void>;
  toggleTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

export type User = {
  id: number;
  username: string;
  email: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password1: string;
  password2: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ApiError = {
  [key: string]: string[]; // Example: { "email": ["This field is required."] }
};
