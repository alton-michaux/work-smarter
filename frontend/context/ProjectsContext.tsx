import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useAPI } from './APIContext';
import { Project, NewProject, ProjectsContextType } from 'types/types';
import { API_URL } from 'lib/api';
import { errorMessage } from 'lib/errors';


const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
};

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAPI();
  
  const { loggedIn, isLoading: isAuthLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state

  const requestProjects = async (): Promise<Project[]> => {
    const res = await fetch(`${API_URL}/projects/`, {
      credentials: 'include', headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  };

  const fetchProjects = async () => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      setProjects(await requestProjects());
    } catch (err) {
      setError(errorMessage(err, 'Unknown error'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load on login. Only sets state once the request settles; until
  // then the provider reports isLoading via `initialLoadPending`. That
  // includes the auth check itself: before it resolves loggedIn is false, and
  // pages would otherwise render their "no projects" empty state.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  if (!loggedIn && initialLoadDone) setInitialLoadDone(false); // load again on next login
  const initialLoadPending = isAuthLoading || (loggedIn && !initialLoadDone);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    requestProjects()
      .then((loaded) => {
        if (cancelled) return;
        setProjects(loaded);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err, 'Unknown error'));
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setInitialLoadDone(true);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const addProject = async (project: Omit<NewProject, 'id'>) => {
    if (!loggedIn) return;
    setIsLoading(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        credentials: 'include',
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      });
      if (!res.ok) throw new Error('Failed to add project');
      const newProject = await res.json();
      setProjects(prev => [...prev, newProject]);
    } catch (err) {
      setError(errorMessage(err, 'Unknown error'));
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
        credentials: 'include',
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedProject),
      });
      if (!res.ok) throw new Error('Failed to update project');
      const data = await res.json();
      setProjects(prev => prev.map(p => (p.id === data.id ? data : p)));
    } catch (err) {
      setError(errorMessage(err, 'Unknown error'));
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
        credentials: 'include',
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(errorMessage(err, 'Unknown error'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProjectsContext.Provider
      value={{ projects, setProjects, addProject, updateProject, deleteProject, fetchProjects, isLoading: isLoading || initialLoadPending, error }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};
