import { useState, FormEvent } from 'react';
import { useAPI } from 'context/APIContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type EncryptedNoteUnlockProps = {
  taskId: number;
  /** Called with the decrypted plaintext and the passphrase that unlocked
   * it — callers that need to re-save the note (e.g. TaskForm) reuse the
   * passphrase rather than asking for it twice. */
  onUnlock: (plaintext: string, passphrase: string) => void;
};

export default function EncryptedNoteUnlock({ taskId, onUnlock }: EncryptedNoteUnlockProps) {
  const { getAuthHeaders } = useAPI();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    setIsUnlocking(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/decrypt/`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to unlock note.');
        return;
      }
      onUnlock(data.description ?? '', passphrase);
    } catch {
      setError('Failed to unlock note.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <form
      onSubmit={handleUnlock}
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-10 px-6 text-center"
    >
      <span className="text-2xl" aria-hidden="true">🔒</span>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This note is encrypted. Enter the passphrase to view it.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          autoFocus
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isUnlocking || !passphrase}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isUnlocking ? 'Unlocking…' : 'Unlock'}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </form>
  );
}
