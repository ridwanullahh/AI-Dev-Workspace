import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { StorageService } from '../../services/StorageService'
import type {
  Project,
  AIProvider,
  Agent,
  ChatMessage,
  Task
} from '../types'

// Initial state
interface WorkspaceState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  projects: Project[];
  currentProject: Project | null;
  providers: AIProvider[];
  currentProvider: string;
  agents: Agent[];
  messages: ChatMessage[];
  tasks: Task[];
}

interface WorkspaceActions {
  initialize: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  addProject: (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'files' | 'aiContext' | 'agents'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProvider: (providerId: string) => void;
  addMessage: (messageData: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  loadProjectData: (projectId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const initialState: WorkspaceState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  projects: [],
  currentProject: null,
  providers: [],
  currentProvider: 'gemini',
  agents: [],
  messages: [],
  tasks: []
}

// Create the workspace store
export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize the workspace
        initialize: async () => {
          try {
            set({ isLoading: true, error: null })
            
            // Initialize storage service
            // await StorageService.initialize()
            
            // Load initial data
            const [projects, providers, agents, messages] = await Promise.all([
              StorageService.getAllProjects(),
              StorageService.getAllAIProviders(),
              StorageService.getAllAgents(),
              StorageService.getAllChatMessages()
            ])
            
            set({
              projects: projects.map(p => ({
                ...p,
                aiContext: {
                  ...p.aiContext,
                  codebaseEmbeddings: new Map(Object.entries(p.aiContext.codebaseEmbeddings || {}))
                }
              })),
              providers,
              agents,
              messages,
              isInitialized: true,
              isLoading: false
            })
            
            console.log('✅ Workspace initialized successfully')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
            set({ error: errorMessage, isLoading: false })
            console.error('❌ Workspace initialization failed:', error)
            throw error
          }
        },

        // Project management
        setCurrentProject: (project: Project | null) => {
          set({ currentProject: project })
          
          // Load project-specific data when project changes
          if (project) {
            get().loadProjectData(project.id)
          }
        },

        addProject: async (projectData) => {
          try {
            const newProject: Project = {
              ...projectData,
              id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              files: [],
              aiContext: {
                projectSummary: '',
                codebaseEmbeddings: new Map(),
                conversationHistory: [],
                knowledgeGraph: [],
                activeMemory: []
              },
              agents: []
            }

            await StorageService.addProject({
              ...newProject,
              aiContext: {
                ...newProject.aiContext,
                projectId: newProject.id,
                codebaseEmbeddings: Object.fromEntries(newProject.aiContext.codebaseEmbeddings),
              },
              gitRepository: newProject.gitRepository ? {
                ...newProject.gitRepository,
                projectId: newProject.id,
                name: newProject.gitRepository.name || newProject.name
              } : undefined,
              agents: newProject.agents.map(a => ({ ...a, projectId: newProject.id })),
              files: newProject.files.map(f => ({ ...f, projectId: newProject.id }))
            })
            set((state) => ({
              projects: [...state.projects, newProject],
              currentProject: newProject
            }))
            
            console.log(`✅ Project created: ${newProject.name}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add project'
            set({ error: errorMessage })
            throw error
          }
        },

        updateProject: async (id: string, updates: Partial<Project>) => {
          try {
            const project = get().projects.find(p => p.id === id)
            if (!project) throw new Error('Project not found')

            const updatedProject = {
              ...project,
              ...updates,
              updatedAt: new Date()
            }

            await StorageService.updateProject(updatedProject.id, {
              ...updatedProject,
              aiContext: {
                ...updatedProject.aiContext,
                projectId: updatedProject.id,
                codebaseEmbeddings: Object.fromEntries(updatedProject.aiContext.codebaseEmbeddings),
              },
              gitRepository: updatedProject.gitRepository ? {
                ...updatedProject.gitRepository,
                projectId: updatedProject.id,
                name: updatedProject.gitRepository.name || updatedProject.name
              } : undefined,
              agents: updatedProject.agents.map(a => ({ ...a, projectId: updatedProject.id })),
              files: updatedProject.files.map(f => ({ ...f, projectId: updatedProject.id }))
            })
            set((state) => ({
              projects: state.projects.map(p => p.id === id ? updatedProject : p),
              currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject
            }))
            
            console.log(`✅ Project updated: ${updatedProject.name}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update project'
            set({ error: errorMessage })
            throw error
          }
        },

        deleteProject: async (id: string) => {
          try {
            await StorageService.deleteProject(id)
            set((state) => ({
              projects: state.projects.filter(p => p.id !== id),
              currentProject: state.currentProject?.id === id ? null : state.currentProject,
              messages: state.messages.filter(m => m.projectId !== id),
              tasks: state.tasks.filter(t => t.projectId !== id)
            }))
            
            console.log(`✅ Project deleted: ${id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete project'
            set({ error: errorMessage })
            throw error
          }
        },

        // Provider management
        setCurrentProvider: (providerId: string) => {
          set({ currentProvider: providerId })
        },

        // Message management
        addMessage: async (messageData) => {
          try {
            const newMessage: ChatMessage = {
              ...messageData,
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date()
            }

            await StorageService.addChatMessage(newMessage)
            set((state) => ({
              messages: [...state.messages, newMessage]
            }))
            
            console.log(`✅ Message added: ${newMessage.id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add message'
            set({ error: errorMessage })
            throw error
          }
        },

        updateMessage: async (id: string, updates: Partial<ChatMessage>) => {
          try {
            const message = get().messages.find(m => m.id === id)
            if (!message) throw new Error('Message not found')

            const updatedMessage = { ...message, ...updates }
            await StorageService.updateChatMessage(updatedMessage.id, updatedMessage)
            set((state) => ({
              messages: state.messages.map(m => m.id === id ? updatedMessage : m)
            }))
            
            console.log(`✅ Message updated: ${id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update message'
            set({ error: errorMessage })
            throw error
          }
        },

        deleteMessage: async (id: string) => {
          try {
            await StorageService.deleteChatMessage(id)
            set((state) => ({
              messages: state.messages.filter(m => m.id !== id)
            }))
            
            console.log(`✅ Message deleted: ${id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete message'
            set({ error: errorMessage })
            throw error
          }
        },

        // Task management
        addTask: async (taskData) => {
          try {
            const newTask: Task = {
              ...taskData,
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
              updatedAt: new Date()
            }

            await StorageService.addTask({
              ...newTask,
              result: newTask.result ? {
                ...newTask.result,
                taskId: newTask.id,
                files: newTask.result.files.map(f => ({
                  ...f,
                  projectId: newTask.projectId
                }))
              } : undefined
            })
            set((state) => ({
              tasks: [...state.tasks, newTask]
            }))
            
            console.log(`✅ Task added: ${newTask.title}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add task'
            set({ error: errorMessage })
            throw error
          }
        },

        updateTask: async (id: string, updates: Partial<Task>) => {
          try {
            const task = get().tasks.find(t => t.id === id)
            if (!task) throw new Error('Task not found')

            const updatedTask = {
              ...task,
              ...updates,
              updatedAt: new Date()
            }

            await StorageService.updateTask(updatedTask.id, {
              ...updatedTask,
              result: updatedTask.result ? {
                ...updatedTask.result,
                taskId: updatedTask.id,
                files: updatedTask.result.files.map(f => ({
                  ...f,
                  projectId: updatedTask.projectId
                }))
              } : undefined
            })
            set((state) => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
            }))
            
            console.log(`✅ Task updated: ${updatedTask.title}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update task'
            set({ error: errorMessage })
            throw error
          }
        },

        deleteTask: async (id: string) => {
          try {
            await StorageService.deleteTask(id)
            set((state) => ({
              tasks: state.tasks.filter(t => t.id !== id)
            }))
            
            console.log(`✅ Task deleted: ${id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete task'
            set({ error: errorMessage })
            throw error
          }
        },

        // Utility actions
        setError: (error: string | null) => {
          set({ error })
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },

        // Helper methods
        loadProjectData: async (projectId: string) => {
          try {
            const [messages, tasks] = await Promise.all([
              StorageService.getAllChatMessages(),
              StorageService.getAllTasks()
            ])
            
            set({
              messages: messages.filter(m => m.projectId === projectId),
              tasks: tasks.filter(t => t.projectId === projectId)
            })
          } catch (error) {
            console.error('Failed to load project data:', error)
          }
        },

        refreshData: async () => {
          try {
            set({ isLoading: true, error: null })
            
            const [projects, providers, agents] = await Promise.all([
              StorageService.getAllProjects(),
              StorageService.getAllAIProviders(),
              StorageService.getAllAgents()
            ])
            
            set({
              projects: projects.map(p => ({
                ...p,
                aiContext: {
                  ...p.aiContext,
                  codebaseEmbeddings: new Map(Object.entries(p.aiContext.codebaseEmbeddings || {}))
                }
              })),
              providers,
              agents,
              isLoading: false
            })
            
            // Refresh project-specific data if a project is selected
            const currentProject = get().currentProject
            if (currentProject) {
              await get().loadProjectData(currentProject.id)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        }
      }),
      {
        name: 'ai-workspace-storage',
        // Only persist basic settings, not large data arrays
        partialize: (state) => ({
          currentProvider: state.currentProvider,
          isInitialized: state.isInitialized
        })
      }
    ),
    {
      name: 'ai-workspace'
    }
  )
)