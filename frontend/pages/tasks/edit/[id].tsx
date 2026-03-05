import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import TaskForm from '../../../components/tasks/TaskForm';
import { useProjects } from '../../../context/ProjectsContext';

export default function TaskEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { tasks, updateTaskAndReload } = useTasks();
  const { projects } = useProjects();

  const task = tasks?.find(t => t.id === Number(id));
  if (!task) return <div>Task not found</div>;

  const handleUpdate = (updatedTask) => {
    updateTaskAndReload({ ...updatedTask, id: Number(id) });
    router.push(`/tasks/view/${id}`);
  };

  const projectOptions = Array.isArray(projects)
    ? projects
    : (projects && typeof projects === 'object' && 'results' in projects ? (projects as any).results : []);
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Task</h1>
      <TaskForm 
        initialTask={task} 
        onSubmit={handleUpdate} 
        submitLabel="Update" 
        projects={projectOptions} 
      />
    </div>
  );
}