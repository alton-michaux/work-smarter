import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTasks } from '../../../context/TasksContext';
import { getCurrentMonday, getEndOfWeek } from '../../../utils/dateUtils';
import WeekSelector from '../../../components/tasks/WeekSelector';
import TaskTable from '../../../components/tasks/TaskTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TaskTrackerPage() {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentMonday());
  const { getAuthHeaders } = useTasks();
  const [tasks, setTasks] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTasks = async () => {
      const end = getEndOfWeek(selectedWeek);
      const headers = getAuthHeaders();

      const res = await fetch(`${API_URL}/tasks?begin_date=${selectedWeek}&end_date=${end}`, {
        headers,
      });
      if (!res.ok) {
        console.error('Failed to fetch tasks');
        return;
      }
      const data = await res.json();
      setTasks(data);
    };

    fetchTasks();
  }, [selectedWeek, getAuthHeaders]);

  const toggleTaskDone = async (task) => {
    const res = await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: !task.is_done }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t))
      );
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Weekly Task Tracker</h1>
      <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
      <TaskTable tasks={tasks} toggleTaskDone={toggleTaskDone} />
      <div className="mt-4 flex gap-2">
        <button onClick={() => router.push('/tasks')}>Back to Task List</button>
        <button onClick={() => router.push('/')}>Home</button>
      </div>
    </div>
  );
}
