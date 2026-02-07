import { DateToggleUIProps } from "types/types";

export const DateToggleUI = ({
  selectedDate,
  setSelectedDate,
  last7Days,
  compact = true,
}: DateToggleUIProps) => {
  if (!selectedDate) return null;

  const btnBase = compact
    ? "px-3 py-2 text-sm"
    : "px-4 py-3 text-sm";

  return (
    <div className="flex gap-2 overflow-x-auto justify-between">
      {last7Days.map((d) => (
        <button
          key={d.key}
          onClick={() => setSelectedDate(d.key)}
          className={`${btnBase} rounded border whitespace-nowrap ${
            d.key === selectedDate
              ? "bg-blue-600 text-white border-blue-600"
              : "hover:bg-gray-50"
          }`}
          title={d.key}
          type="button"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
};
