import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, WorkspaceContextType } from '@/types';

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize workspace
  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        setIsLoading(true);
        // Load projects from storage or API
        const storedProjects = localStorage.getItem('workspace-projects');
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          setProjects(parsedProjects);
        }

        // Load current project
        const storedCurrentProject = localStorage.getItem('current-project');
        if (storedCurrentProject) {
          const parsedCurrentProject = JSON.parse(storedCurrentProject);
          setCurrentProject(parsedCurrentProject);
        }
      } catch (err) {
        console.error('Failed to initialize workspace:', err);
        setError('Failed to load workspace data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  const value: WorkspaceContextType = {
    currentProject,
    projects,
    isLoading,
    error,
    setCurrentProject: (project: Project | null) => {
      setCurrentProject(project);
      if (project) {
        localStorage.setItem('current-project', JSON.stringify(project));
      } else {
        localStorage.removeItem('current-project');
      }
    },
    addProject: (project: Project) => {
      const newProjects = [...projects, project];
      setProjects(newProjects);
      localStorage.setItem('workspace-projects', JSON.stringify(newProjects));
    },
    updateProject: (projectId: string, updates: Partial<Project>) => {
      const updatedProjects = projects.map(p =>
        p.id === projectId ? { ...p, ...updates } : p
      );
      setProjects(updatedProjects);
      localStorage.setItem('workspace-projects', JSON.stringify(updatedProjects));

      // Update current project if it's the one being updated
      if (currentProject?.id === projectId) {
        const updatedCurrentProject = { ...currentProject, ...updates };
        setCurrentProject(updatedCurrentProject);
        localStorage.setItem('current-project', JSON.stringify(updatedCurrentProject));
      }
    },
    removeProject: (projectId: string) => {
      const filteredProjects = projects.filter(p => p.id !== projectId);
      setProjects(filteredProjects);
      localStorage.setItem('workspace-projects', JSON.stringify(filteredProjects));

      // Reset current project if it's the one being removed
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        localStorage.removeItem('current-project');
      }
    },
    clearError: () => setError(null),
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };