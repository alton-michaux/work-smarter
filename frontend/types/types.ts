// types.ts

//---------LOCAL-----//

type Grouped<T> = {
  groups: Record<string, T[]>;
  sortedDays: string[];
};

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  href?: string;
};

type TaskIdLike =
  | number
  | Task
  | { id?: number; task?: { id?: number }; pk?: number };

//------TASK---------//

export type AnyTask = Task & CollapsedMeta;

export type Task = {
  id: number;
  title: string;
  description?: string;
  is_done: boolean;
  priority: string;
  category: string;
  carry_over?: boolean;
  is_subtask?: boolean;
  
  parent?: number | null;

  project?: number;
  begin_date: string;
  end_date: string;
  deadline_date?: string | null;
  begin_time?: string | null;
  end_time?: string | null;

  recurring_task?: number | null;
  recurring_task_id?: number | string | null;
  recurring_frequency?: string | null;

  google_event_id?: string | null;
  deadline_event_id?: string | null;

  user: number;
};

export type CreateTaskPayload = {
  title: string;
  begin_date?: string | null;
  deadline_date?: string | null;
  category?: string | null;
  project?: number | null;

  // ✅ subtasks
  parent?: number | null;

  // ✅ keep explicit so DRF won't complain
  recurring_task?: number | null;

  // optional fields you may want to send sometimes
  description?: string;
  priority?: string;
  is_done?: boolean;
  carry_over?: boolean;
};

export type TaskLayoutProps = {
  sections: {
    meetings: any[];
    tasks: any[];
    notes: any[];
  };
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleDone?: (id: number, isDone: boolean) => void;
};

export type TaskFormProps = {
  initialTask: any;
  onSubmit: (task: any) => void;
  submitLabel: string;
  projects?: ProjectOption[];
};

export type TasksContextType = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  addSubtask: (payload: CreateTaskPayload) => Promise<void>;
  updateTaskAndReload: (task: Task) => Promise<void>;
  deleteTask: (taskOrId: TaskIdLike, options?: DeleteTaskOptions) => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchTasksByDateRange: (begin: string, end: string, active_on: string) => Promise<void>;
  fetchTasksForTimeline: (begin: string, end: string) => Promise<void>;
  fetchRecurringTemplate: (recurring_task_id: number, initialTask: any, setRecurrence: any) => Promise<void>;
  toggleTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  pushToCalendar: (taskId: number) => Promise<Task>;
  pushDeadlineToCalendar: (taskId: number) => Promise<Task>;
  blacklistEvent: (googleEventId: string, title: string, deleteTask?: boolean) => Promise<void>;
  pullFromCalendar: (dateFrom: string, dateTo: string) => Promise<{ imported: number; skipped: number }>;
  notes: Task[];
  isLoadingNotes: boolean;
  fetchNotes: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  searchResults: Task[];
  isSearching: boolean;
  fetchTasksBySearch: (query: string, category?: string) => Promise<void>;
};

export type GoogleCalendarStatus = {
  connected: boolean;
  selected_calendar_id: string | null;
};

export type CalendarBlacklistEntry = {
  id: number;
  google_event_id: string;
  title: string;
  created_at: string;
};

export type DeleteTaskOptions = { deleteSeries?: boolean; deleteFuture?: boolean };

export type TaskLike = {
  id: number | string;
  title: string;
  begin_date?: string | null;
  priority?: string | null;
  is_done?: boolean;
};

export type SubtaskProgress = {
  done: number;
  total: number;
};

export type RecurringDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onDeleteOccurrence: () => void | Promise<void>;
  onDeleteFuture: () => void | Promise<void>;
  onDeleteSeries: () => void | Promise<void>;
  title?: string;
  body?: string;
};

//------PROJECT---------//

export type Project = {
  created: Date;
  id: number;
  name: string;
  color?: string;
  status?: 'active' | 'complete';
  description?: string;
  role?: string;
  tasks?: Task[];
  user?: number | User;
};

export type NewProject = {
  name: string;
  user: number;
  status?: 'active' | 'complete';
  description?: string;
  role?: string;
};

export type ProjectsContextType = {
  projects: Project[];  
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (project: Omit<NewProject, 'id'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  fetchProjects: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

export type ProjectOption = { id: number; name: string };

//------NOTE---------//

export type Note = {
  id: number | string;
  title?: string;
  begin_date?: string | null;
  priority?: string | null;
  category?: string | null;
  description?: string;
  is_done: boolean;
};

export type NoteProps = {
  note: Note;

  // optional actions (daily log uses these; weekly tracker can omit)
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;

  // display tweaks
  showMeta?: boolean;      // date/priority line
  variant?: 'default' | 'dashed'; // dashed looks “ongoing”
  collapsible?: boolean;   // truncate description with expand toggle
};

//------UTILITY---------//

export type Node = any;

export type SystemsContextType = {
  fileChange: (file: File | null) => void;
  uploadStatus: string | null;
  selectedFile: File | null;
  exportCsv: () => Promise<void>;
  error: string | null;
};

export type RecurrenceState = {
  repeats: boolean;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
  day_of_week: number; // 0=Mon .. 6=Sun
  start_date: string;  // YYYY-MM-DD
  skip_weekends: boolean;
};

export type CollapsedMeta = {
  __collapsed?: boolean;
  __occurrenceCount?: number;
  __firstDate?: string | null;
  __lastDate?: string | null;
};

export type WeeklyOptions = {
  frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
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
  tz_offset?: number;
  category?: string;
  page_size?: number;
  timeline?: boolean;
};

/** 'comfortable' stacks the title and its metadata on two lines.
 *  'compact' puts them on a single line to fit more rows on screen. */
export type OutlineDensity = 'comfortable' | 'compact';

export type OutlineRowProps = {
  node: Node;
  depth: number;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (task: any) => void;
  onToggleDone?: (id: number, isDone: boolean) => void;

  density?: OutlineDensity;

  onAddSubtask?: (args: { parentId: number; title: string; beginDate?: string | null; category?: string | null; project?: number | null }) => Promise<void>;
}

export type OutlineTreeProps = {
  nodes: Node[];
  depth?: number;

  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleDone?: (id: number, isDone: boolean) => void;

  density?: OutlineDensity;

  onAddSubtask?: (args: { parentId: number; title: string; beginDate?: string | null; category?: string | null; project?: number | null }) => Promise<void>;
};

export type PanelProps = {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;

  /** Stretch to the full height of the parent (default). When false the panel
   *  hugs its content and only scrolls once it would exceed the parent. */
  fill?: boolean;
};

//--------UI---------//

export type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: Action[];
  href?: string;
};

export type TrackerProps = {
  tasks: Task[];     // kept for backwards compatibility even if unused here
  meetings: Task[];
  work: Task[];
  notes

  // OPTIONAL: only used by Weekly Tracker (daily log can ignore)
  collapsedMeetings?: Task[];
  collapsedWork?: Task[];

  subtaskProgressByParentId?: Record<number, { done: number; total: number }>;
};

export type QuickAddProps = {
  selectedDate: string;
};

export type DateToggleUIProps = {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  last7Days: { key: string; label: string }[];
  compact?: boolean;
}

export type WeekSelectorProps = {
  selectedWeek: string;
  onWeekChange: (newWeek: string) => void;
};

export type ProjectSummaryProps = {
  totalCount: number;
  doneCount: number;
  activeStart: string;
  activeEnd: string;
  lastActivity: string;

  remainingPreview: TaskLike[];
  remainingCount: number;
  remainingOverflow: number;
  remainingLimit?: number;
};

export type ProjectTimelineProps<T extends TaskLike> = {
  title?: string;
  summaryRight?: React.ReactNode; // e.g. "12 total • 7 done • 5 open"
  emptyText: string;

  iconFor: (t: T) => React.ReactNode; // 🗓️ or ☐/☑
  metaFor?: (t: T) => React.ReactNode; // optional second line
  titleClassFor?: (t: T) => string; // e.g. line-through for done

  grouped: Grouped<T>;
  onItemClick?: (t: T) => void;
};

export type MarkdownBodyProps = {
  value?: string | null;
  emptyText?: string;
  truncateLines?: number;
};


export type MarkdownEditProps = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helpText?: string;
};

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

//------AUTH/API---------//

export type User = {
  id: number;
  username: string;
  email: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type AuthContextType = {
  user: User | null;
  loggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  setLoggedIn: (v: boolean) => void;
  register: (form: { email: string; password1: string; password2: string }) => Promise<void>;
  login: (form: { email: string; password: string }) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  getUser: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  refreshAccessToken: () => Promise<string | null>;
};

export type APIContextType = {
  getAuthHeaders: () => Record<string, string>;
  getImportCsvSpec: () => Promise<void>;
  importTasksCsv: (file: File, dryRun: boolean) => Promise<void>
  getAuthHeadersForForm: () => Record<string, string>;
  fileUpload: (selectedFile: File | null) => Promise<Response | void>;
  uploadStatus: string | null;
  isLoading: boolean;
  error: string | null;
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

//------RESUME-------//

export type Resume = {
  id: number;
  title: string;
  file: string;
  uploaded_at: string;
};

export type ResumeAnalysis = {
  score: number;
  summary: string;
  suggestions: string[];
  accomplishments: string[];
  bullet_rewrites: Record<string, string>;
  analyzed_at: string;
  is_cached: boolean;
};

export type ResumeAnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ResumeAnalysis }
  | { status: 'error'; message: string };

export type GeneratedResume = {
  content: string;
  updated_at: string;
  source_fingerprint: string;
  is_cached: boolean;
};

export type ResumeGenerationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GeneratedResume }
  | { status: 'error'; message: string };

export type ResumesContextType = {
  resumes: Resume[];
  isLoading: boolean;
  error: string | null;
  fetchResumes: () => Promise<void>;
  uploadResume: (file: File, title: string) => Promise<void>;
  deleteResume: (id: number) => Promise<void>;
  downloadResume: (id: number, filename: string) => Promise<void>;
  analyzeResume: (id: number, forceRefresh?: boolean) => Promise<ResumeAnalysis>;
  generateResume: (id: number, forceRefresh?: boolean) => Promise<GeneratedResume>;
  downloadGeneratedResume: (resumeId: number, title: string) => Promise<void>;
  generateNewResume: (forceRefresh?: boolean, userInfo?: { phone?: string; location?: string }) => Promise<GeneratedResume>;
  downloadNewGeneratedResume: () => Promise<void>;
};

export type PersonalAPIKeyScope = 'read' | 'read_write';

export type PersonalAPIKey = {
  id: number;
  name: string;
  prefix: string;
  scope: PersonalAPIKeyScope;
  created_at: string;
  last_used_at: string | null;
};

/** Only returned by POST /keys/ — the secret is never retrievable again. */
export type NewPersonalAPIKey = PersonalAPIKey & { key: string };
