import { DateToggleUIProps } from "types/types";

export const DateToggleUI = ({
  selectedDate,
  setSelectedDate,
  last7Days,
  compact = true,
}: DateToggleUIProps) => {
  if (!selectedDate) return null;

  const sizeClasses = compact
    ? "h-9 px-3 text-sm"
    : "h-11 px-4 text-sm";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
        {last7Days.map((d) => {
          const isActive = d.key === selectedDate;

          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedDate(d.key)}
              title={d.key}
              className={[
                "flex items-center justify-center",
                sizeClasses,
                "min-w-[72px]",
                "rounded-md font-medium",
                "transition-colors duration-150",
                isActive
                  ? "bg-blue-600 text-white ring-1 ring-blue-600"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200",
              ].join(" ")}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};