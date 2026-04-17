import Button from "components/ui/button";
import { EmptyStateProps } from "types/types";

export default function EmptyStateCard({
  title,
  description,
  actions = [],
}: EmptyStateProps) {
  return (
    <div className="max-w-lg mx-auto text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8">
      <div className="text-gray-400 dark:text-gray-500 mb-4">
        <svg className="w-8 h-8 mx-auto"/>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
      )}

      {actions.length > 0 && (
        <div className="flex justify-center gap-3 mt-6">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant ?? "secondary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}