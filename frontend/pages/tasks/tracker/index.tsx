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
    <div className="min-h-screen bg-gray-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Weekly Task Tracker
        </h1>

        <WeekSelector
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />

        <div className="mt-6">
          <TaskTable
            tasks={tasks}
            toggleTaskDone={(task) => toggleTaskDone(task.id, task.is_done)}
          />
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push('/tasks')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            ← Back to Tasks
          </button>
        </div>
      </div>
    </div>
  );
}
