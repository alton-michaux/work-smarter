import { useEffect, useState } from 'react';
import { useAPI } from 'context/APIContext';
import { toast } from 'sonner';
import { NewPersonalAPIKey, PersonalAPIKey } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ApiKeysCard() {
  const { getAuthHeaders } = useAPI();

  const [keys, setKeys] = useState<PersonalAPIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);

  // Held in memory only, and only until the user dismisses it. The backend
  // cannot return this value again.
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/keys/`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PersonalAPIKey[]) => setKeys(data))
      .catch(() => toast.error('Failed to load API keys.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${API_URL}/keys/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || 'Failed to create API key.');
        return;
      }

      const created = data as NewPersonalAPIKey;
      const { key, ...metadata } = created;
      setKeys((prev) => [metadata, ...prev]);
      setNewKey(key);
      setName('');
      toast.success('API key created.');
    } catch {
      toast.error('Failed to create API key.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    setRevokingId(id);
    try {
      const res = await fetch(`${API_URL}/keys/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        setConfirmRevokeId(null);
        toast.success('API key revoked.');
      } else {
        toast.error('Failed to revoke API key.');
      }
    } catch {
      toast.error('Failed to revoke API key.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Could not copy. Select the key and copy it manually.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">API Keys</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Read-only access to your tasks and projects from scripts and other tools. Keys
          cannot create, edit or delete anything.
        </p>
      </div>

      {/* One-time reveal of a freshly created key */}
      {newKey && (
        <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Copy your key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap rounded bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-amber-800 dark:text-amber-300 hover:underline"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Create */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Key name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. laptop scripts"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating…' : 'Create key'}
        </button>
      </div>

      {/* List */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        {isLoading ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No API keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800 dark:text-gray-200">
                    {k.name || 'Unnamed key'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    <code>{k.prefix}…</code> · created {formatDate(k.created_at)} · last used{' '}
                    {formatDate(k.last_used_at)}
                  </p>
                </div>
                {confirmRevokeId === k.id ? (
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      {revokingId === k.id ? 'Revoking…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmRevokeId(null)}
                      disabled={revokingId === k.id}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRevokeId(k.id)}
                    className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Usage */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Using your key</p>
        <pre className="overflow-x-auto rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-700 dark:text-gray-300">
{`curl -H "Authorization: Api-Key YOUR_KEY" \\
  "${API_URL}/v1/tasks/?is_done=false"`}
        </pre>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Available: <code>/v1/tasks/</code> and <code>/v1/projects/</code>. Tasks accept{' '}
          <code>category</code>, <code>priority</code>, <code>project</code>,{' '}
          <code>is_done</code>, <code>search</code>, and a <code>begin_date</code>/
          <code>end_date</code> window.
        </p>
      </div>
    </div>
  );
}
