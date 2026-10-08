// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import { User, AuthContextType } from 'types/types';
import { getCsrfHeaders } from 'lib/csrf';
import { API_URL } from 'lib/api';
import { errorMessage } from 'lib/errors';


const AuthContext = createContext<AuthContextType | null>(null);

// register/login throw an Error whose message is the JSON error body from
// dj-rest-auth, e.g. {"non_field_errors": ["..."]}.
type AuthErrorBody = { non_field_errors?: string[]; password1?: string[]; error?: string };

function parseAuthError(err: unknown): AuthErrorBody {
  const message = err instanceof Error ? err.message : '';
  return message.includes('{') ? JSON.parse(message) : { error: message };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Starts true: the initial session check (getUser() on mount) hasn't run
  // yet, and consumers like withAuth must not redirect before it resolves.
  const [isLoading, setIsLoading] = useState(true);

  // guards re-hydration from running multiple times per session
  const hydratedOnce = useRef(false);

  const register = async (form: { email: string; password1: string; password2: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/registration/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(JSON.stringify(data));
      }

      router.push('/login');
    } catch (err) {
      const msg = parseAuthError(err);
      setError(msg?.non_field_errors?.[0] || msg?.password1?.[0] || msg?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // The access/refresh JWTs live in httpOnly cookies now, so there's no
  // client-readable signal of auth state — this is the only way to check it.
  const getUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/user/`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.status === 401) {
        setUser(null);
        setLoggedIn(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to fetch user');
      }

      // Handle either {results: [...]} or a single object
      const maybeUser = Array.isArray(data?.results) ? data?.results[0] ?? null : data;
      setUser(maybeUser);
      setLoggedIn(true);
    } catch (err) {
      setError(errorMessage(err, 'Failed to fetch user'));
      setUser(null);
      setLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (form: { email: string; password: string }) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify(form),
      });

      const data = await res.json(); // read once
      if (!res.ok) {
        throw new Error(JSON.stringify(data));
      }

      hydratedOnce.current = true;

      // One-time user fetch immediately after login
      await getUser();

      setLoggedIn(true);
      router.push('/dashboard');
    } catch (err) {
      const msg = parseAuthError(err);
      setError(msg?.non_field_errors?.[0] || msg?.error || 'Login failed');
      setLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Clear local state and redirect immediately — don't wait on the server
    setLoggedIn(false);
    setUser(null);
    setError(null);
    hydratedOnce.current = false;
    router.replace('/login');

    // Fire-and-forget server-side cookie clearing / refresh-token blacklist
    fetch(`${API_URL}/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
    }).catch((err) => console.error('Server logout failed:', err));
  };

  // Rehydrate on first mount — seed the CSRF cookie, then check for an
  // existing session via the httpOnly access cookie.
  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    fetch(`${API_URL}/auth/csrf/`, { credentials: 'include' })
      .catch(() => {})
      .finally(() => {
        getUser();
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loggedIn, isLoading, error, setLoggedIn, register, login, logout, getUser, refreshAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
