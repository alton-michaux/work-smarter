// lib/api.ts
import { getCsrfHeaders } from 'lib/csrf';

export const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function fetcher(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
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
