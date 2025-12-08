import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Project, NewProject } from 'types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type ProjectsContextType = {
  projects: Project[];  
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (project: Omit<NewProject, 'id'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  fetchProjects: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
};

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAPI();
  
  const { loggedIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state

  const fetchProjects = async () => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`${API_URL}/projects/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) fetchProjects();
  }, [loggedIn]);

  const addProject = async (project: Omit<NewProject, 'id'>) => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      });
      if (!res.ok) throw new Error('Failed to add project');
      const newProject = await res.json();
      setProjects(prev => (prev ? [...prev, newProject] : [newProject]));
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (updatedProject: Project) => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`${API_URL}/projects/${updatedProject.id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedProject),
      });
      if (!res.ok) throw new Error('Failed to update project');
      const data = await res.json();
      setProjects(prev => prev.map(p => (p.id === data.id ? data : p)));
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: number) => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`${API_URL}/projects/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProjectsContext.Provider
      value={{ projects, setProjects, addProject, updateProject, deleteProject, fetchProjects, isLoading, error }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};
