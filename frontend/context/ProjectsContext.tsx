import React, { createContext, useState, useContext, ReactNode } from 'react';

type Project = {
  id: number;
  name: string;
  // Add other fields as needed
};

type ProjectsContextType = {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
};

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  return (
    <ProjectsContext.Provider value={{ projects, setProjects }}>
      {children}
    </ProjectsContext.Provider>
  );
};