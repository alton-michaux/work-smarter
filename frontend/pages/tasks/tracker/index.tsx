import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../utils/dateUtils';
import WeekSelector from '../../../components/tasks/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';

export default function TaskTrackerPage() {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentMonday());
  const { tasks, fetchTasksByDateRange, toggleTaskDone } = useTasks();
  const router = useRouter();

  useEffect(() => {
    const end = getEndOfWeek(selectedWeek);
    fetchTasksByDateRange(selectedWeek, end);
  }, [selectedWeek, fetchTasksByDateRange]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Weekly Task Tracker</h1>
      <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
      <TaskTable tasks={tasks} toggleTaskDone={(task) => toggleTaskDone(task.id, task.is_done)} />
      <div className="mt-4 flex gap-2">
        <button onClick={() => router.push('/tasks')}>Back to Task List</button>
        <button onClick={() => router.push('/')}>Home</button>
      </div>
    </div>
  );
}
