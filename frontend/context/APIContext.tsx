// context/APIContext.tsx
import React, { useState, createContext, useContext, ReactNode } from 'react';
import { APIContextType } from 'types/types';

const APIContext = createContext<APIContextType | undefined>(undefined);

export const useAPI = (): APIContextType => {
  const context = useContext(APIContext);
  if (!context) throw new Error('useAPI must be used within an APIProvider');
  return context;
};

export const APIProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  };

  const getAuthHeadersForForm = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    // IMPORTANT: do NOT set Content-Type for FormData
    return {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    };
  };

  const fileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import/`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          // Do NOT set Content-Type manually with FormData
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || 'Upload failed');
      }

      setUploadStatus('Upload successful!');
      return res;
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      setError(message);
      setUploadStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <APIContext.Provider
      value={{ getAuthHeaders, getAuthHeadersForForm, fileUpload, uploadStatus, isLoading, error }}
    >
      {children}
    </APIContext.Provider>
  );
};
