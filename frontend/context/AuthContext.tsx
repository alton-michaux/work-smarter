// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import { User, AuthContextType } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // guards re-hydration from running multiple times per session
  const hydratedOnce = useRef(false);

  const register = async (form: { email: string; password1: string; password2: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/registration/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(JSON.stringify(data));
      }

      router.push('/login');
    } catch (err: any) {
      const msg = err.message?.includes('{') ? JSON.parse(err.message) : { error: err.message };
      setError(msg?.non_field_errors?.[0] || msg?.password1?.[0] || msg?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to fetch user');
      }

      // Handle either {results: [...]} or a single object
      const maybeUser = Array.isArray(data?.results) ? data?.results[0] ?? null : data;
      setUser(maybeUser);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user');
      setUser(null);
      setLoggedIn(false);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (form: { username: string; password: string }) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json(); // read once
      if (!res.ok) {
        throw new Error(JSON.stringify(data));
      }

      // jwt payload (dj-rest-auth/jwt): adjust if your shape differs
      if (data?.access) {
        localStorage.setItem('authToken', data.access);
        hydratedOnce.current = true;
      } else if (data?.key) {
        // fallback if using token auth
        localStorage.setItem('authToken', data.key);
        hydratedOnce.current = true;
      } else {
        throw new Error('No token returned from login');
      }

      // One-time user fetch immediately after login
      await getUser();

      setLoggedIn(true);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message?.includes('{') ? JSON.parse(err.message) : { error: err.message };
      setError(msg?.non_field_errors?.[0] || msg?.error || 'Login failed');
      setLoggedIn(false);
      setUser(null);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // Clear local state and redirect immediately — don't wait on the server
    localStorage.removeItem('authToken');
    setLoggedIn(false);
    setUser(null);
    setError(null);
    hydratedOnce.current = false;
    router.replace('/login');

    // Fire-and-forget server-side token invalidation
    if (token) {
      fetch(`${API_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => console.error('Server logout failed:', err));
    }
  };

  // Rehydrate on first mount if a token exists
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token && !hydratedOnce.current) {
      setLoggedIn(true);
      getUser().catch(() => {
        // if rehydrate fails, force logout state
        localStorage.removeItem('authToken');
        setLoggedIn(false);
        setUser(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loggedIn, isLoading, error, setLoggedIn, register, login, logout, getUser, getAuthHeaders }}
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
