import { useState, useCallback, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Project, ProjectFile } from '../services/types';
import { projectManagerService } from '../services/projectManager';

interface UseProjectOptions {
  projectId?: string;
  autoLoad?: boolean;
}

interface UseProjectReturn {
  // Project data
  project: Project | null;
  files: ProjectFile[];
  stats: {
    totalFiles: number;
    linesOfCode: number;
    lastActivity: Date | null;
    tasksCompleted: number;
    activeTasks: number;
  } | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isSaving: boolean;
  error: string | null;

  // Project operations
  loadProject: (id: string) => Promise<void>;
  createProject: (options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
  }) => Promise<Project>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  deleteProject: () => Promise<void>;
  refreshProject: () => Promise<void>;

  // File operations
  addFile: (file: Omit<ProjectFile, 'id' | 'lastModified'>) => Promise<ProjectFile>;
  updateFile: (fileId: string, updates: Partial<ProjectFile>) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  getFile: (fileId: string) => ProjectFile | undefined;
  searchFiles: (query: string) => Promise<Array<{
    fileId: string;
    path: string;
    content: string;
    score: number;
  }>>;

  // Utility
  exportProject: () => Promise<any>;
  cloneProject: (newName: string) => Promise<Project>;
}

export function useProject(options: UseProjectOptions = {}): UseProjectReturn {
  const { projectId, autoLoad = true } = options;
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    createProject: contextCreateProject,
    deleteProject: contextDeleteProject,
    showAlert
  } = useWorkspace();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project data
  const loadProject = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const projectData = await projectManagerService.getProject(id);
      if (!projectData) {
        throw new Error('Project not found');
      }

      const projectFiles = await projectManagerService.getProjectFiles?.(id) || projectData.files || [];
      const projectStats = await projectManagerService.getProjectStats(id);

      setProject(projectData);
      setFiles(projectFiles);
      setStats(projectStats);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      console.error('Load project error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new project
  const createProject = useCallback(async (options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
  }): Promise<Project> => {
    try {
      setIsCreating(true);
      setError(null);

      const newProject = await contextCreateProject(options);
      await loadProject(newProject.id);
      
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [contextCreateProject, loadProject]);

  // Update project
  const updateProject = useCallback(async (updates: Partial<Project>) => {
    if (!project) return;

    try {
      setIsSaving(true);
      setError(null);

      await projectManagerService.updateProject(project.id, updates);
      await loadProject(project.id);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      showAlert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [project, loadProject, showAlert]);

  // Delete project
  const deleteProject = useCallback(async () => {
    if (!project) return;

    try {
      await contextDeleteProject(project.id);
      setProject(null);
      setFiles([]);
      setStats(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      throw err;
    }
  }, [project, contextDeleteProject]);

  // Refresh project data
  const refreshProject = useCallback(async () => {
    if (project) {
      await loadProject(project.id);
    }
  }, [project, loadProject]);

  // File operations
  const addFile = useCallback(async (file: Omit<ProjectFile, 'id' | 'lastModified'>): Promise<ProjectFile> => {
    if (!project) throw new Error('No project selected');

    try {
      const newFile = await projectManagerService.addFile(project.id, file);
      await loadProject(project.id); // Refresh to get updated files
      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add file';
      setError(errorMessage);
      throw err;
    }
  }, [project, loadProject]);

  const updateFile = useCallback(async (fileId: string, updates: Partial<ProjectFile>) => {
    if (!project) return;

    try {
      await projectManagerService.updateFile(project.id, fileId, updates);
      await loadProject(project.id); // Refresh to get updated files
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      setError(errorMessage);
      showAlert('Error', errorMessage);
    }
  }, [project, loadProject, showAlert]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!project) return;

    try {
      await projectManagerService.deleteFile(project.id, fileId);
      await loadProject(project.id); // Refresh to get updated files
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      showAlert('Error', errorMessage);
    }
  }, [project, loadProject, showAlert]);

  const getFile = useCallback((fileId: string): ProjectFile | undefined => {
    return files.find(f => f.id === fileId);
  }, [files]);

  const searchFiles = useCallback(async (query: string) => {
    if (!project) return [];

    try {
      return await projectManagerService.searchProjectContent(project.id, query, {
        type: 'all',
        limit: 20
      });
    } catch (err) {
      console.error('File search error:', err);
      return [];
    }
  }, [project]);

  // Utility operations
  const exportProject = useCallback(async () => {
    if (!project) return null;

    try {
      return await projectManagerService.exportProject(project.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export project';
      setError(errorMessage);
      showAlert('Error', errorMessage);
      return null;
    }
  }, [project, showAlert]);

  const cloneProject = useCallback(async (newName: string): Promise<Project> => {
    if (!project) throw new Error('No project selected');

    try {
      const clonedProject = await projectManagerService.cloneProject(project.id, newName);
      return clonedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone project';
      setError(errorMessage);
      throw err;
    }
  }, [project]);

  // Auto-load project
  useEffect(() => {
    if (autoLoad) {
      if (projectId) {
        loadProject(projectId);
      } else if (currentProject) {
        loadProject(currentProject.id);
      }
    }
  }, [projectId, currentProject?.id, autoLoad, loadProject]);

  // Sync with current project from context
  useEffect(() => {
    if (currentProject && (!project || project.id !== currentProject.id)) {
      setProject(currentProject);
    }
  }, [currentProject, project]);

  return {
    // Project data
    project,
    files,
    stats,

    // Loading states
    isLoading,
    isCreating,
    isSaving,
    error,

    // Project operations
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProject,

    // File operations
    addFile,
    updateFile,
    deleteFile,
    getFile,
    searchFiles,

    // Utility
    exportProject,
    cloneProject
  };
}

// Specialized hooks
export function useCurrentProject() {
  return useProject({ autoLoad: true });
}

export function useProjectById(projectId: string) {
  return useProject({ projectId, autoLoad: true });
}