// lib/api.ts
import { getCsrfHeaders } from 'lib/csrf';

// Includes the /api prefix, matching NEXT_PUBLIC_API_URL in .env.local. The
// fallback only applies when the variable is unset (e.g. an image built
// without --build-arg NEXT_PUBLIC_API_URL).
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetcher(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getCsrfHeaders(),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'API error');
  }

  return res.json();
}
