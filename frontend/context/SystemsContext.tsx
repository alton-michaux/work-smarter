import React, { useState, createContext, useContext, ReactNode } from 'react';
import { SystemsContextType } from 'types/types';
import { useAPI } from './APIContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SystemsContext = createContext<SystemsContextType | undefined>(undefined);

export const useSystem = (): SystemsContextType => {
  const context = useContext(SystemsContext);
  if (!context) throw new Error('useSystem must be used within an SystemsProvider');
  return context;
};

export const SystemsProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { getAuthHeaders } = useAPI()

  const fileChange = (file) => {
      if (file) {
        // Only allow txt for now
        const validTypes = ['text/plain']; // later add 'text/csv' for CSV
        if (validTypes.includes(file.type)) {
            setSelectedFile(file);
            setUploadStatus('File valid')
        } else {
            setError('Invalid file type. Please upload a .txt file.')
            setUploadStatus('Invalid file type. Please upload a .txt file.');
        }
      }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_URL}/export/csv`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();

      // Try to infer filename from Content-Disposition if backend sends it
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      const filename = match?.[1] ? decodeURIComponent(match[1]) : 'work-smarter-export.csv';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export CSV. Check the server logs and try again.');
    }
  };

  return (
    <SystemsContext.Provider value={{ 
      fileChange, 
      selectedFile, 
      uploadStatus, 
      exportCsv, 
      error 
    }}>
      {children}
    </SystemsContext.Provider>
  );
};
