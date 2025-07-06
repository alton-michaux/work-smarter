import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Project = {
  id: number;
  name: string;
};

type ProjectsContextType = {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  fetchProjects: () => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
};

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Token ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  const fetchProjects = async () => {
    const res = await fetch(`${API_URL}/projects/`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addProject = async (project: Omit<Project, 'id'>) => {
    const res = await fetch(`${API_URL}/projects/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(project),
    });
    const newProject = await res.json();
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = async (updatedProject: Project) => {
    const res = await fetch(`${API_URL}/projects/${updatedProject.id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedProject),
    });
    const data = await res.json();
    setProjects(prev => prev.map(p => (p.id === data.id ? data : p)));
  };

  const deleteProject = async (id: number) => {
    await fetch(`${API_URL}/projects/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <ProjectsContext.Provider
      value={{ projects, setProjects, addProject, updateProject, deleteProject, fetchProjects }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};
