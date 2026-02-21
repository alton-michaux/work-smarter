import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAPI } from "../context/APIContext";
import { ResultPanel } from "../components/ui/importSummary"

export default function ImportPage() {
  const router = useRouter();
  const { getImportCsvSpec, importTasksCsv } = useAPI();

  const [spec, setSpec] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getImportCsvSpec();
      setSpec(data);
    })();
  }, [getImportCsvSpec]);

  const fileMeta = useMemo(() => {
    if (!file) return null;
    const sizeKb = Math.round(file.size / 1024);
    return { name: file.name, sizeKb };
  }, [file]);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!file) {
      setError("Pick a CSV file first.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await importTasksCsv(file, dryRun);
      setResult(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (e?.response?.data ? JSON.stringify(e.response.data) : null) ||
        e?.message ||
        "Import failed.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!spec) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
            <div className="text-sm text-gray-600">Loading import spec…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Import</h1>
            <p className="mt-2 text-sm text-gray-600">
              Upload a CSV to create or update tasks. Use a dry run to validate before writing data.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              type="button"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: uploader */}
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  CSV Upload
                </div>
                <div className="text-xs text-gray-500">
                  {dryRun ? "Dry run enabled" : "Live import"}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* File input */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select a CSV file
                  </label>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-700
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />

                  {fileMeta && (
                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <div className="font-medium truncate" title={fileMeta.name}>
                        {fileMeta.name}
                      </div>
                      <div className="text-xs text-gray-500">{fileMeta.sizeKb} KB</div>
                    </div>
                  )}
                </div>

                {/* Dry run toggle */}
                <div className="flex items-start justify-between gap-4 rounded-md border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Dry run (validate only)
                    </div>
                    <div className="text-sm text-gray-600">
                      Checks formatting and required fields without saving anything.
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {dryRun ? "On" : "Off"}
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => {
                      setFile(null);
                      setError(null);
                      setResult(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 transition"
                    type="button"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={!file || isSubmitting}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                      !file || isSubmitting
                        ? "bg-blue-300 text-white cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                    type="button"
                  >
                    {isSubmitting ? "Uploading…" : dryRun ? "Validate CSV" : "Import CSV"}
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                    <div className="text-sm font-semibold text-red-800">
                      Import error
                    </div>
                    <pre className="mt-1 text-sm text-red-800 whitespace-pre-wrap break-words">
                      {error}
                    </pre>
                  </div>
                )}

                {/* Result */}
                {result && <ResultPanel result={result} />}
              </div>
            </div>
          </div>

          {/* Right: spec */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Expected Columns
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Your CSV should include the following headers.
                </p>

                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                    Headers ({spec?.headers?.length ?? 0})
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {spec?.headers?.map((h: string) => (
                      <li key={h} className="px-4 py-2 text-sm text-gray-800">
                        <code className="text-[13px] text-gray-900">{h}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="text-sm font-semibold text-blue-900">Tip</div>
                  <div className="mt-1 text-sm text-blue-900">
                    Start with a dry run first. Once it validates cleanly, turn it off to import for real.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => router.push("/tasks")}
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                type="button"
              >
                View Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}