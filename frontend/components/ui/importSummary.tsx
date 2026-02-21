export function ResultPanel({ result }: { result: any }) {
  // Try to extract something meaningful without assuming too much
  const imported =
    result?.imported ??
    result?.created ??
    result?.created_count ??
    result?.ok_count ??
    result?.success_count ??
    0;

  const warnings =
    result?.warnings?.length ??
    result?.warning_count ??
    0;

  const errors =
    result?.errors?.length ??
    result?.error_count ??
    0;

  const isDryRun =
    result?.dry_run ?? result?.dryRun ?? result?.validated_only ?? false;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white">
      {/* Summary row */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {isDryRun ? "Validation complete" : "Import complete"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {isDryRun
              ? "No data was written. Review warnings/errors before importing."
              : "Your CSV was processed and changes were applied."}
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700">
            Imported: {imported}
          </span>

          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700">
            Warnings: {warnings}
          </span>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              errors > 0 ? "border-red-200 text-red-700" : "text-gray-700"
            }`}
          >
            Errors: {errors}
          </span>
        </div>
      </div>

      {/* Expandable details */}
      <details className="border-t">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          View details
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-[420px] overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}