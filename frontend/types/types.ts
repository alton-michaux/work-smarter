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
  user: number;
};

export type Project = {
  id: number;
  name: string;
  tasks: Task[];
  user: number;
};

export type NewProject = {
  name: string;
  user: number;
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

export type CursorPage<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};
