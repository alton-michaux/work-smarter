import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useTasks } from '../../context/TasksContext';
import TaskForm from '../../components/tasks/TaskForm';
import Spinner from 'components/shared/Spinner';
import { useProjects } from '../../context/ProjectsContext';

const emptyTask = {
  title: '',
  category: '',
  priority: '',
  description: '',
  is_done: false,
  is_subtask: false,
  carry_over: false,
  user: '',
  project: '',
};

export default function TaskCreatePage() {
  const router = useRouter();
  const { addTask, isLoading } = useTasks(); // Add isLoading

  const handleCreate = async (task) => {
    await addTask(task);
    router.push('/tasks');
  };

  const initialTask = useMemo(() => {
    const qTitle = typeof router.query.title === 'string' ? router.query.title : '';
    const qDate = typeof router.query.date === 'string' ? router.query.date : '';

    return {
      ...emptyTask,
      title: qTitle || emptyTask.title,
      begin_date: qDate || undefined,
      end_date: qDate || undefined,
    };
  }, [router.query.title, router.query.date]);

  const { projects } = useProjects();

  const projectOptions = Array.isArray(projects)
    ? projects
    : (projects && typeof projects === 'object' && 'results' in projects ? (projects as any).results : []);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Task</h1>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <TaskForm
            initialTask={initialTask}
            onSubmit={handleCreate}
            submitLabel="Create"
            projects={projectOptions}
          />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}