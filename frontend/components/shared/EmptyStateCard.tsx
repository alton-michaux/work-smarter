import Button from "components/ui/button";
import { EmptyStateProps } from "types/types";

export default function EmptyStateCard({
  title,
  description,
  actions = [],
}: EmptyStateProps) {
  return (
    <div className="max-w-lg mx-auto text-center bg-white border border-gray-200 rounded-lg shadow-sm p-8">
      <div className="text-gray-400 mb-4">
        <svg className="w-8 h-8 mx-auto"/>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {description && (
        <p className="text-sm text-gray-600 mt-2">{description}</p>
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