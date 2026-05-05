import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Resume, ResumeAnalysis, GeneratedResume, ResumesContextType } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ResumesContext = createContext<ResumesContextType | undefined>(undefined);

export const useResumes = () => {
  const context = useContext(ResumesContext);
  if (!context) throw new Error('useResumes must be used within a ResumesProvider');
  return context;
};

export const ResumesProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAPI();
  const { loggedIn } = useAuth();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/resumes/`, { headers: getAuthHeaders() });
      if (res.status === 401) { setError('Unauthorized'); return; }
      if (!res.ok) throw new Error(`Failed to fetch resumes: ${res.status}`);
      const data = await res.json();
      setResumes(data);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, getAuthHeaders]);

  const uploadResume = useCallback(async (file: File, title: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);

      // Omit Content-Type so the browser sets multipart boundary automatically
      const headers = getAuthHeaders();
      delete (headers as any)['Content-Type'];

      const res = await fetch(`${API_URL}/resumes/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }

      const created: Resume = await res.json();
      setResumes((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  const deleteResume = useCallback(async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/resumes/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
      throw e;
    }
  }, [getAuthHeaders]);

  const analyzeResume = useCallback(async (id: number, forceRefresh = false): Promise<ResumeAnalysis> => {
    const url = `${API_URL}/resumes/${id}/analyze/${forceRefresh ? '?refresh=1' : ''}`;
    const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Analysis failed: ${res.status}`);
    }
    return res.json();
  }, [getAuthHeaders]);

  const generateResume = useCallback(async (id: number, forceRefresh = false): Promise<GeneratedResume> => {
    const url = `${API_URL}/resumes/${id}/generate/${forceRefresh ? '?refresh=1' : ''}`;
    const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Generation failed: ${res.status}`);
    }
    return res.json();
  }, [getAuthHeaders]);

  const downloadGeneratedResume = useCallback(async (resumeId: number, title: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/resumes/${resumeId}/generate/download/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'resume'}_improved.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
      throw e;
    }
  }, [getAuthHeaders]);

  const generateNewResume = useCallback(async (forceRefresh = false): Promise<GeneratedResume> => {
    const url = `${API_URL}/resumes/generate-new/${forceRefresh ? '?refresh=1' : ''}`;
    const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Generation failed: ${res.status}`);
    }
    return res.json();
  }, [getAuthHeaders]);

  const downloadNewGeneratedResume = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/resumes/generate-new/download/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated_resume.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
      throw e;
    }
  }, [getAuthHeaders]);

  const downloadResume = useCallback(async (id: number, filename: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/resumes/${id}/download/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      const resolvedName = match?.[1] ? decodeURIComponent(match[1]) : filename;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
      throw e;
    }
  }, [getAuthHeaders]);

  return (
    <ResumesContext.Provider value={{ resumes, isLoading, error, fetchResumes, uploadResume, deleteResume, downloadResume, analyzeResume, generateResume, downloadGeneratedResume, generateNewResume, downloadNewGeneratedResume }}>
      {children}
    </ResumesContext.Provider>
  );
};
