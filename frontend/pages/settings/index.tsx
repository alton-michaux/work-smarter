import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAPI } from 'context/APIContext';
import { useTasks } from 'context/TasksContext';
import { useTheme } from 'context/ThemeContext';
import { toast } from 'sonner';
import { CalendarBlacklistEntry, GoogleCalendarStatus } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CalendarOption = { id: string; summary: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function SettingsPage() {
  const router = useRouter();
  const { loggedIn, user, getUser } = useAuth();
  const { getAuthHeaders } = useAPI();
  const { pullFromCalendar } = useTasks();
  const { theme, toggleTheme } = useTheme();

  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Account — username + email
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  useEffect(() => {
    if (user?.username) setUsername(user.username);
    if (user?.email) setEmail(user.email);
  }, [user?.username, user?.email]);

  // Account — password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [pullDateFrom, setPullDateFrom] = useState(todayStr());
  const [pullDateTo, setPullDateTo] = useState(plusDays(7));
  const [isPulling, setIsPulling] = useState(false);

  const [blacklist, setBlacklist] = useState<CalendarBlacklistEntry[]>([]);
  const [isLoadingBlacklist, setIsLoadingBlacklist] = useState(false);

  // Handle callback redirect from Google OAuth
  useEffect(() => {
    if (router.query.calendar_connected === 'true') {
      toast.success('Google Calendar connected!');
      router.replace('/settings', undefined, { shallow: true });
    }
    if (router.query.calendar_error) {
      toast.error(`Connection failed: ${router.query.calendar_error}`);
      router.replace('/settings', undefined, { shallow: true });
    }
  }, [router.query]);

  // Fetch connection status
  useEffect(() => {
    if (!loggedIn) return;

    fetch(`${API_URL}/calendar/status/`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: GoogleCalendarStatus) => {
        setCalendarStatus(data);
        if (data.selected_calendar_id) setSelectedCalendarId(data.selected_calendar_id);
      })
      .catch(() => {});
  }, [loggedIn]);

  // Fetch calendar list and blacklist when connected
  useEffect(() => {
    if (!calendarStatus?.connected) return;

    fetch(`${API_URL}/calendar/calendars/`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: CalendarOption[]) => setCalendars(data))
      .catch(() => {});

    setIsLoadingBlacklist(true);
    fetch(`${API_URL}/calendar/blacklist/list/`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: CalendarBlacklistEntry[]) => setBlacklist(data))
      .catch(() => {})
      .finally(() => setIsLoadingBlacklist(false));
  }, [calendarStatus?.connected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_URL}/calendar/oauth/init/`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error('Failed to start Google OAuth flow.');
        setIsConnecting(false);
      }
    } catch {
      toast.error('Failed to connect Google Calendar.');
      setIsConnecting(false);
    }
  };

  const handleSaveCalendar = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/calendar/select/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ calendar_id: selectedCalendarId }),
      });
      if (res.ok) {
        toast.success('Calendar saved.');
      } else {
        toast.error('Failed to save calendar selection.');
      }
    } catch {
      toast.error('Failed to save calendar selection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      const { imported, skipped } = await pullFromCalendar(pullDateFrom, pullDateTo);
      if (imported === 0) {
        toast.info(`No new events found (${skipped} already imported).`);
      } else {
        toast.success(`Imported ${imported} meeting${imported !== 1 ? 's' : ''} from Google Calendar.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to pull from Google Calendar.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleRemoveBlacklist = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/calendar/blacklist/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setBlacklist((prev) => prev.filter((e) => e.id !== id));
        toast.success('Removed from blacklist.');
      } else {
        toast.error('Failed to remove from blacklist.');
      }
    } catch {
      toast.error('Failed to remove from blacklist.');
    }
  };

  const handleSaveAccount = async () => {
    setIsSavingAccount(true);
    try {
      const res = await fetch(`${API_URL}/auth/user/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ username, email }),
      });
      if (res.ok) {
        await getUser();
        toast.success('Account updated.');
      } else {
        const data = await res.json();
        toast.error(data?.email?.[0] || data?.username?.[0] || 'Failed to update account.');
      }
    } catch {
      toast.error('Failed to update account.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordErrors({});
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/change/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ old_password: oldPassword, new_password1: newPassword1, new_password2: newPassword2 }),
      });
      if (res.ok) {
        setOldPassword('');
        setNewPassword1('');
        setNewPassword2('');
        toast.success('Password changed.');
      } else {
        const data = await res.json();
        setPasswordErrors(data);
        toast.error('Please fix the errors below.');
      }
    } catch {
      toast.error('Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!loggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
    <div className="max-w-2xl mx-auto px-6 space-y-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Appearance card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose between light and dark theme.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}</p>
      </div>

      {/* Account info card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your username and email address.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="your@email.com"
            />
          </div>
        </div>
        <button
          onClick={handleSaveAccount}
          disabled={isSavingAccount}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSavingAccount ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Change Password card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Requires your current password.</p>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Current password', value: oldPassword, setter: setOldPassword, key: 'old_password' },
            { label: 'New password', value: newPassword1, setter: setNewPassword1, key: 'new_password1' },
            { label: 'Confirm new password', value: newPassword2, setter: setNewPassword2, key: 'new_password2' },
          ].map(({ label, value, setter, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {passwordErrors[key]?.map((err, i) => (
                <p key={i} className="mt-1 text-xs text-red-600 dark:text-red-400">{err}</p>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={handleChangePassword}
          disabled={isSavingPassword}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSavingPassword ? 'Saving…' : 'Change password'}
        </button>
      </div>

      {/* Google Calendar card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Google Calendar</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Push meetings to your Google Calendar.
            </p>
          </div>

          {calendarStatus?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900 dark:bg-opacity-20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
              Not connected
            </span>
          )}
        </div>

        {!calendarStatus?.connected && (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {isConnecting ? 'Redirecting…' : 'Connect Google Calendar'}
          </button>
        )}

        {calendarStatus?.connected && calendars.length > 0 && (
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Push meetings to
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveCalendar}
                  disabled={isSaving}
                  className="shrink-0 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pull from Google Calendar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Import events as meetings. Already-imported events are skipped.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">From</label>
                  <input
                    type="date"
                    value={pullDateFrom}
                    onChange={(e) => setPullDateFrom(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">To</label>
                  <input
                    type="date"
                    value={pullDateTo}
                    onChange={(e) => setPullDateTo(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <button
                  onClick={handlePull}
                  disabled={isPulling}
                  className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {isPulling ? 'Importing…' : 'Import events'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Import Blacklist</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Events listed here will never be imported. Use "Never import again" on a meeting task to add entries.
                </p>
              </div>
              {isLoadingBlacklist ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
              ) : blacklist.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No events blacklisted.</p>
              ) : (
                <ul className="space-y-2">
                  {blacklist.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
                    >
                      <span className="truncate text-gray-800 dark:text-gray-300">
                        {entry.title || entry.google_event_id}
                      </span>
                      <button
                        onClick={() => handleRemoveBlacklist(entry.id)}
                        className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
