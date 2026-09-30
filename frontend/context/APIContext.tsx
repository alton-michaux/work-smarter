// context/APIContext.tsx
import React, { useState, createContext, useContext, ReactNode } from 'react';
import { APIContextType } from 'types/types';
import { getCsrfHeaders } from 'lib/csrf';
import { API_URL } from 'lib/api';

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
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...getCsrfHeaders(),
    };
  };

  const getAuthHeadersForForm = () => {
    // IMPORTANT: do NOT set Content-Type for FormData
    return {
      Accept: 'application/json',
      ...getCsrfHeaders(),
    };
  };

  const getImportCsvSpec = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/import/csv/spec/`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      setError(message);
      setUploadStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  const importTasksCsv = async (file: File, dryRun: boolean) => {
    const formData = new FormData();
    formData.append("file", file); // this MUST match upload_field: "file"

    const url = `${API_URL}${dryRun ? "/import/csv/?dry_run=true" : "/import/csv/"}`;
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeadersForForm(),
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      console.log("IMPORT RESPONSE DATA:", data);

      return data
    } catch (err: any) {
      const message = err?.message?.detail || 'Unknown error';
      setError(message);
      setUploadStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/import/`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeadersForForm(),
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
      value={{
        getAuthHeaders,
        getImportCsvSpec,
        importTasksCsv,
        getAuthHeadersForForm,
        fileUpload,
        uploadStatus,
        isLoading,
        error
      }}
    >
      {children}
    </APIContext.Provider>
  );
};
