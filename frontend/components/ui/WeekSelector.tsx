import { WeekSelectorProps } from "types/types";

export default function WeekSelector({ selectedWeek, onWeekChange }: WeekSelectorProps) {
  const changeWeek = (offset: number) => {
    const current = new Date(selectedWeek);
    current.setDate(current.getDate() + offset * 7);
    onWeekChange(current.toISOString().split('T')[0]);
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <button
        onClick={() => changeWeek(-1)}
        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        <span className="mr-2">←</span>
        Previous Week
      </button>

      <div className="flex justify-center">
        <div className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm">
          Week of <span className="font-bold">{selectedWeek}</span>
        </div>
      </div>

      <button
        onClick={() => changeWeek(1)}
        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        Next Week
        <span className="ml-2">→</span>
      </button>
    </div>
  );
}
