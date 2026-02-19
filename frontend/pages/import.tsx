import { useEffect, useState } from "react";
import { useAPI } from "../context/APIContext";

export default function ImportPage() {
  const { getImportCsvSpec, importTasksCsv } = useAPI();

  const [spec, setSpec] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getImportCsvSpec();
      setSpec(data);
    })();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!file) {
      setError("Pick a CSV file first.");
      return;
    }

    try {
      const data = await importTasksCsv(file, dryRun);
      setResult(data);
    } catch (e: any) {
      // axios style error
      const msg =
        e?.response?.data?.detail ||
        JSON.stringify(e?.response?.data) ||
        e?.message ||
        "Import failed.";
      setError(msg);
    }
  };

  if (!spec) return <div>Loading spec...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>CSV Import</h2>

      <div style={{ marginTop: 12 }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          {" "}Dry run (validate only)
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSubmit}>Upload</button>
      </div>

      {error && (
        <pre style={{ marginTop: 12, color: "crimson" }}>
          {error}
        </pre>
      )}

      {result && (
        <pre style={{ marginTop: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <hr style={{ margin: "24px 0" }} />

      <h3>Expected columns</h3>
      <ul>
        {spec?.headers?.map((h: string) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
