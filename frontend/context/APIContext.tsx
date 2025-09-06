import React, { useState, createContext, useContext, ReactNode, useCallback } from 'react';

type APIContextType = {
  getAuthHeaders: () => Record<string, string>;
  fileUpload: (selectedFile: File | null) => Promise<Response>;
  uploadStatus: string | null;
  isLoading: boolean;
  error: string | null;
};

const APIContext = createContext<APIContextType | undefined>(undefined);

const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

export const useAPI = (): APIContextType => {
  const context = useContext(APIContext);
  if (!context) throw new Error('useAPI must be used within an APIProvider');
  return context;
};

export const APIProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('')

  const getAuthHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // 'Content-Type' should NOT be set manually when using FormData
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.detail || 'Upload failed');
      }

      setUploadStatus('Upload successful!');
      return res;
    } catch (error: any) {
      const message = error.message || 'Unknown error';
      setError(message);
      setUploadStatus(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <APIContext.Provider value={{ getAuthHeaders, fileUpload, uploadStatus, isLoading, error }}>
      {children}
    </APIContext.Provider>
  )
};
