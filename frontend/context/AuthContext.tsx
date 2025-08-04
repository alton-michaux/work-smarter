import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const login = async (form) => {
      setError(null);

      try {
          const res = await fetch(`${API_URL}/auth/login/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
          });

          if (!res.ok) {
              const data = await res.json();
              throw new Error(JSON.stringify(data));
          }

          const data = await res.json();
          // Save token to localStorage (or sessionStorage)
          if (data.key) {
              localStorage.setItem('authToken', data.key);
          }

          setLoggedIn(true);
          router.push('/dashboard');
      } catch (err: any) {
          const msg = err.message.includes('{') ? JSON.parse(err.message) : { error: err.message };
          setError(msg?.non_field_errors?.[0] || msg?.error || 'Login failed');
      }
  };

  const logout = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
          await fetch(`${API_URL}/auth/logout/`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Token ${token}`,
              },
          });
      }
      localStorage.removeItem('authToken');
      setLoggedIn(false);
      router.push('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setLoggedIn(!!token);
  }, []);

  return (
    <AuthContext.Provider value={{ loggedIn, setLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);