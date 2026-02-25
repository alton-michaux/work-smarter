export function ResultPanel({ result }: { result: any }) {
  const imported =
    result?.imported ??
    result?.created ??
    result?.created_count ??
    result?.ok_count ??
    result?.success_count ??
    0;

  const warningsArr: any[] = Array.isArray(result?.warnings) ? result.warnings : [];
  const errorsArr: any[] = Array.isArray(result?.errors) ? result.errors : [];

  const warningsCount = result?.warning_count ?? warningsArr.length ?? 0;
  const errorsCount = result?.error_count ?? errorsArr.length ?? 0;

  const isDryRun =
    result?.dry_run ?? result?.dryRun ?? result?.validated_only ?? false;

  const formatItem = (x: any) => {
    if (typeof x === "string") return x;
    if (x?.detail && typeof x.detail === "string") return x.detail;
    if (x?.message && typeof x.message === "string") return x.message;
    return JSON.stringify(x);
  };

  const PreviewList = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: any[];
    tone: "red" | "amber";
  }) => {
    if (!items.length) return null;

    const preview = items.slice(0, 5);
    const overflow = Math.max(0, items.length - preview.length);

    const toneStyles =
      tone === "red"
        ? {
            wrap: "border-red-200 bg-red-50",
            title: "text-red-900",
            item: "text-red-900",
            meta: "text-red-700",
          }
        : {
            wrap: "border-amber-200 bg-amber-50",
            title: "text-amber-900",
            item: "text-amber-900",
            meta: "text-amber-700",
          };

    return (
      <div className={`rounded-lg border ${toneStyles.wrap} px-4 py-3`}>
        <div className={`text-sm font-semibold ${toneStyles.title}`}>
          {title}
        </div>

        <ul className="mt-2 space-y-2">
          {preview.map((x, idx) => (
            <li
              key={idx}
              className={`text-sm ${toneStyles.item} rounded bg-white/60 px-3 py-2`}
              title={formatItem(x)}
            >
              <div className="truncate">{formatItem(x)}</div>
            </li>
          ))}
        </ul>

        {overflow > 0 && (
          <div className={`mt-2 text-xs ${toneStyles.meta}`}>
            +{overflow} more. See details below.
          </div>
        )}
      </div>
    );
  };

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

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700">
            Imported: {imported}
          </span>

          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-gray-700">
            Warnings: {warningsCount}
          </span>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              errorsCount > 0 ? "border-red-200 text-red-700" : "text-gray-700"
            }`}
          >
            Errors: {errorsCount}
          </span>
        </div>
      </div>

      {/* Human-friendly issues */}
      {(errorsArr.length || warningsArr.length) ? (
        <div className="px-4 pb-4 space-y-3">
          <PreviewList title="Errors" items={errorsArr} tone="red" />
          <PreviewList title="Warnings" items={warningsArr} tone="amber" />
        </div>
      ) : null}

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