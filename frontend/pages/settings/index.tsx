import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useAPI } from 'context/APIContext';
import { toast } from 'sonner';
import { GoogleCalendarStatus } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CalendarOption = { id: string; summary: string };

export default function SettingsPage() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const { getAuthHeaders } = useAPI();

  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Fetch calendar list when connected
  useEffect(() => {
    if (!calendarStatus?.connected) return;

    fetch(`${API_URL}/calendar/calendars/`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: CalendarOption[]) => setCalendars(data))
      .catch(() => {});
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

  if (!loggedIn) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Google Calendar card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Google Calendar</h2>
            <p className="text-sm text-gray-500 mt-1">
              Push meetings to your Google Calendar.
            </p>
          </div>

          {calendarStatus?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200">
              Not connected
            </span>
          )}
        </div>

        {!calendarStatus?.connected && (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isConnecting ? 'Redirecting…' : 'Connect Google Calendar'}
          </button>
        )}

        {calendarStatus?.connected && calendars.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Push meetings to
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
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
        )}
      </div>
    </div>
  );
}
