import { DateToggleUIProps } from "types/types";

export const DateToggleUI = ({
  selectedDate,
  setSelectedDate,
  last7Days,
  compact = true,
}: DateToggleUIProps) => {
  if (!selectedDate) return null;

  const sizeClasses = compact
    ? "h-8 px-2.5 text-sm"
    : "h-11 px-4 text-sm";

  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {last7Days.map((d) => {
        const isActive = d.key === selectedDate;

        return (
          <button
            key={d.key}
            type="button"
            onClick={() => setSelectedDate(d.key)}
            title={d.key}
            className={[
              "flex items-center justify-center shrink-0",
              sizeClasses,
              "min-w-[56px]",
              "rounded-md font-medium",
              "transition-colors duration-150",
              isActive
                ? "bg-blue-600 text-white ring-1 ring-blue-600"
                : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600",
            ].join(" ")}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
};