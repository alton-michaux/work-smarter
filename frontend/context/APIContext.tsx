import React, { createContext, useContext, ReactNode } from 'react';

type APIContextType = {
  getAuthHeaders: () => Record<string, string>;
};

const APIContext = createContext<APIContextType | undefined>(undefined);

export const APIProvider = ({ children }: { children: ReactNode }) => {
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  return (
    <APIContext.Provider value={{ getAuthHeaders }}>
      {children}
    </APIContext.Provider>
  );
};

export const useAPI = (): APIContextType => {
  const context = useContext(APIContext);
  if (!context) throw new Error('useAPI must be used within an APIProvider');
  return context;
};
