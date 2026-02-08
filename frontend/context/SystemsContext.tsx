import React, { useState, createContext, useContext, ReactNode } from 'react';
import { SystemsContextType } from 'types/types';

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

  return (
    <SystemsContext.Provider value={{ fileChange, selectedFile, uploadStatus, error }}>
      {children}
    </SystemsContext.Provider>
  );
};
