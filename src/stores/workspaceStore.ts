import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { storageService } from '../services/storage'
import type { 
  WorkspaceState, 
  WorkspaceActions, 
  Project, 
  AIProvider, 
  Agent, 
  ChatMessage, 
  Task 
} from '../types'

// Initial state
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
            await storageService.initialize()
            
            // Load initial data
            const [projects, providers, agents, messages] = await Promise.all([
              storageService.getAllProjects(),
              storageService.getAllAIProviders(),
              storageService.getAllAgents(),
              storageService.getMessages()
            ])
            
            set({
              projects,
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
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
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

            await storageService.saveProject(newProject)
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
              updatedAt: new Date().toISOString()
            }

            await storageService.saveProject(updatedProject)
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
            await storageService.deleteProject(id)
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
              timestamp: new Date().toISOString()
            }

            await storageService.saveMessage(newMessage)
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
            await storageService.saveMessage(updatedMessage)
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
            await storageService.deleteMessage(id)
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
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

            await storageService.saveTask(newTask)
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
              updatedAt: new Date().toISOString()
            }

            await storageService.saveTask(updatedTask)
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
            await storageService.deleteTask(id)
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
              storageService.getMessages(projectId),
              storageService.getTasks(projectId)
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
              storageService.getAllProjects(),
              storageService.getAllAIProviders(),
              storageService.getAllAgents()
            ])
            
            set({
              projects,
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