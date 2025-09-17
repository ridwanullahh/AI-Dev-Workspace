import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Project, Agent, AIProvider, ChatMessage, Task, ProjectFile } from '../services/types';
import { StorageService } from '../services/StorageService';
import { enhancedAIProviderManager } from '../services/enhancedAIProviderManager';
import { enhancedAgentOrchestrator } from '../services/enhancedAgentOrchestrator';
import { enhancedProjectManager } from '../services/enhancedProjectManager';
import { enhancedVectorDatabase } from '../services/enhancedVectorDatabase';
import { gitManager } from '../services/gitManager';
import { Alert, Platform } from 'react-native';

interface WorkspaceContextType {
  // Initialization
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  createProject: (options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
  }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;

  // AI Providers
  providers: AIProvider[];
  currentProvider: string;
  setCurrentProvider: (providerId: string) => void;
  addProviderAccount: (providerId: string, account: {
    name: string;
    apiKey?: string;
    oauthToken?: string;
    isActive: boolean;
  }) => Promise<void>;
  refreshProviders: () => Promise<void>;

  // Agents
  agents: Agent[];
  toggleAgent: (agentId: string, isActive: boolean) => Promise<void>;
  refreshAgents: () => Promise<void>;

  // Chat
  messages: ChatMessage[];
  sendMessage: (content: string, projectId?: string, agentId?: string) => Promise<void>;
  clearMessages: (projectId?: string) => Promise<void>;
  refreshMessages: (projectId?: string) => Promise<void>;

  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  refreshTasks: (projectId?: string) => Promise<void>;

  // Files
  addFile: (projectId: string, file: Omit<ProjectFile, 'id' | 'lastModified'>) => Promise<ProjectFile>;
  updateFile: (projectId: string, fileId: string, updates: Partial<ProjectFile>) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  searchContent: (query: string, projectId?: string) => Promise<any[]>;

  // Utility
  showAlert: (title: string, message: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Initialize workspace
  useEffect(() => {
    initializeWorkspace();
  }, []);

  const initializeWorkspace = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing AI Workspace...');

      // Initialize all services in order
      await StorageService.initialize();
      console.log('✅ Storage service initialized');

      await enhancedVectorDatabase.initialize();
      console.log('✅ Vector search initialized');

      await enhancedAIProviderManager.initialize();
      console.log('✅ AI provider manager initialized');

      await enhancedAgentOrchestrator.initialize();
      console.log('✅ Agent orchestrator initialized');

      await enhancedProjectManager.initialize();
      console.log('✅ Project manager initialized');

      await gitManager.initialize();
      console.log('✅ Git manager initialized');

      // Load initial data
      await Promise.all([
        refreshProjects(),
        refreshProviders(),
        refreshAgents(),
        refreshMessages()
      ]);

      console.log('🎉 AI Workspace fully initialized!');
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize workspace';
      setError(errorMessage);
      console.error('❌ Workspace initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Project management
  const createProject = async (options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
  }): Promise<Project> => {
    try {
      const project = await enhancedProjectManager.createProject(options);
      await refreshProjects();
      setCurrentProject(project);
      
      // Create search index for project
      await enhancedVectorDatabase.createIndex(`project_${project.id}`);
      
      return project;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await enhancedProjectManager.deleteProject(projectId);
      await enhancedVectorDatabase.deleteIndex(`project_${projectId}`);
      await refreshProjects();
      
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const refreshProjects = async () => {
    try {
      const allProjects = await enhancedProjectManager.getProjects();
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to refresh projects:', err);
    }
  };

  // AI Provider management
  const addProviderAccount = async (providerId: string, account: {
    name: string;
    apiKey?: string;
    oauthToken?: string;
    isActive: boolean;
  }): Promise<void> => {
    try {
      await enhancedAIProviderManager.addAccount(providerId, account);
      await refreshProviders();
      showAlert('Success', 'Provider account added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add provider account';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const refreshProviders = async () => {
    try {
      const allProviders = await enhancedAIProviderManager.getProviders();
      setProviders(allProviders);
    } catch (err) {
      console.error('Failed to refresh providers:', err);
    }
  };

  // Agent management
  const toggleAgent = async (agentId: string, isActive: boolean): Promise<void> => {
    try {
      await enhancedAgentOrchestrator.toggleAgent(agentId, isActive);
      await refreshAgents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const refreshAgents = async () => {
    try {
      const allAgents = await enhancedAgentOrchestrator.getAgents();
      setAgents(allAgents);
    } catch (err) {
      console.error('Failed to refresh agents:', err);
    }
  };

  // Chat management
  const sendMessage = async (content: string, projectId?: string, agentId?: string): Promise<void> => {
    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        content,
        role: 'user',
        projectId: projectId || currentProject?.id,
        timestamp: new Date(),
        metadata: {
          provider: currentProvider
        }
      };

      // Save user message
      await StorageService.addChatMessage(userMessage);
      await refreshMessages(projectId);

      // Send to AI provider with context
      const contextMessages = await getRelevantContext(content, projectId);
      const response = await enhancedAIProviderManager.sendMessage({
        messages: [...contextMessages, userMessage],
        model: currentProvider
      });

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        content: response.content,
        role: 'assistant',
        agentId,
        projectId: projectId || currentProject?.id,
        timestamp: new Date(),
        metadata: {
          model: response.model,
          provider: response.provider,
          tokens: response.usage.totalTokens,
          cost: response.cost
        }
      };

      // Save AI message and update context
      await StorageService.addChatMessage(aiMessage);
      await addToSearchIndex(aiMessage);
      await refreshMessages(projectId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  // Get relevant context for AI queries
  const getRelevantContext = async (query: string, projectId?: string): Promise<ChatMessage[]> => {
    try {
      const searchResults = await enhancedVectorDatabase.search(query, {
        indexName: projectId ? `project_${projectId}` : undefined,
        limit: 5,
        threshold: 0.4
      });

      // Convert search results to context messages
      return searchResults.map(result => ({
        id: `context_${result.id}`,
        content: result.content,
        role: 'system' as const,
        timestamp: new Date(),
        metadata: { source: 'context', score: result.score }
      }));
    } catch (err) {
      console.error('Failed to get context:', err);
      return [];
    }
  };

  // Add message to search index
  const addToSearchIndex = async (message: ChatMessage) => {
    try {
      const indexName = message.projectId ? `project_${message.projectId}` : 'global';
      await enhancedVectorDatabase.addDocuments(indexName, [{
        id: message.id,
        content: message.content,
        metadata: {
          type: 'conversation' as const,
          role: message.role,
          timestamp: message.timestamp.getTime(),
          projectId: message.projectId
        }
      }]);
    } catch (err) {
      console.error('Failed to add message to search index:', err);
    }
  };

  const clearMessages = async (projectId?: string): Promise<void> => {
    try {
      // This would need implementation in storage service
      await refreshMessages(projectId);
    } catch (err) {
      console.error('Failed to clear messages:', err);
    }
  };

  const refreshMessages = async (projectId?: string) => {
    try {
      const allMessages = await StorageService.getMessages(projectId || currentProject?.id);
      setMessages(allMessages);
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  };

  // Task management
  const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const newTask: Task = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await enhancedAgentOrchestrator.assignTask(newTask);
      await refreshTasks(task.projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const refreshTasks = async (projectId?: string) => {
    try {
      const allTasks = await StorageService.getTasks(projectId || currentProject?.id);
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  };

  // File management
  const addFile = async (projectId: string, file: Omit<ProjectFile, 'id' | 'lastModified'>): Promise<ProjectFile> => {
    try {
      const newFile = await enhancedProjectManager.addFile(projectId, file);
      
      // Add to search index
      await enhancedVectorDatabase.addDocuments(`project_${projectId}`, [{
        id: `file_${newFile.id}`,
        content: `${newFile.path}: ${newFile.content}`,
        metadata: {
          type: 'code' as const,
          language: newFile.language,
          path: newFile.path,
          projectId
        }
      }]);

      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add file';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const updateFile = async (projectId: string, fileId: string, updates: Partial<ProjectFile>): Promise<void> => {
    try {
      await enhancedProjectManager.updateFile(projectId, fileId, updates);
      
      // Update search index if content changed
      if (updates.content) {
        const project = projects.find(p => p.id === projectId);
        const file = project?.files.find(f => f.id === fileId);
        if (file) {
          await enhancedVectorDatabase.addDocuments(`project_${projectId}`, [{
            id: `file_${fileId}`,
            content: `${file.path}: ${updates.content}`,
            metadata: {
              type: 'code' as const,
              language: file.language,
              path: file.path,
              projectId
            }
          }]);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  const deleteFile = async (projectId: string, fileId: string): Promise<void> => {
    try {
      await enhancedProjectManager.deleteFile(projectId, fileId);
      await enhancedVectorDatabase.removeDocuments(`project_${projectId}`, [`file_${fileId}`]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      showAlert('Error', errorMessage);
      throw err;
    }
  };

  // Utility functions
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const searchContent = async (query: string, projectId?: string): Promise<any[]> => {
    try {
      const searchProjectId = projectId || currentProject?.id;
      if (!searchProjectId) return [];

      return await enhancedVectorDatabase.search(query, {
        indexName: `project_${searchProjectId}`,
        limit: 20,
        threshold: 0.3
      });
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  };

  // Auto-refresh current project messages and tasks
  useEffect(() => {
    if (currentProject) {
      refreshMessages(currentProject.id);
      refreshTasks(currentProject.id);
    }
  }, [currentProject]);

  const contextValue: WorkspaceContextType = {
    // Initialization
    isInitialized,
    isLoading,
    error,

    // Projects
    projects,
    currentProject,
    setCurrentProject,
    createProject,
    deleteProject,
    refreshProjects,

    // AI Providers
    providers,
    currentProvider,
    setCurrentProvider,
    addProviderAccount,
    refreshProviders,

    // Agents
    agents,
    toggleAgent,
    refreshAgents,

    // Chat
    messages,
    sendMessage,
    clearMessages,
    refreshMessages,

    // Tasks
    tasks,
    createTask,
    refreshTasks,

    // Files
    addFile,
    updateFile,
    deleteFile,
    searchContent,

    // Utility
    showAlert
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}