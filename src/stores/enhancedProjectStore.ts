import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { enhancedProjectManager } from '../services/enhancedProjectManager'
import type { Project, ProjectFile, GitIntegration } from '../types'

interface EnhancedProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filteredProjects: Project[]
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'progress'
  sortOrder: 'asc' | 'desc'
  gitIntegrations: Map<string, GitIntegration>
  projectStats: Map<string, any>
  templates: any[]
}

interface EnhancedProjectActions {
  // Project CRUD operations
  createProject: (projectData: {
    name: string
    description: string
    type: Project['type']
    templateId?: string
    initializeGit?: boolean
    gitRemoteUrl?: string
    gitCredentials?: {
      username: string
      token: string
    }
  }) => Promise<void>
  
  cloneGitProject: (options: {
    name: string
    description: string
    gitUrl: string
    branch?: string
    credentials?: {
      username: string
      token: string
    }
  }) => Promise<void>
  
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  
  // Git operations
  commitChanges: (projectId: string, message: string, author?: {
    name: string
    email: string
  }) => Promise<string>
  
  pushChanges: (projectId: string) => Promise<void>
  pullChanges: (projectId: string) => Promise<void>
  
  createBranch: (projectId: string, branchName: string, startPoint?: string) => Promise<void>
  switchBranch: (projectId: string, branchName: string) => Promise<void>
  
  getBranches: (projectId: string) => Promise<string[]>
  getCommitHistory: (projectId: string, options?: {
    depth?: number
    since?: Date
  }) => Promise<Array<{
    oid: string
    message: string
    author: {
      name: string
      email: string
      timestamp: number
    }
    date: Date
  }>>
  
  syncGitStatus: (projectId: string) => Promise<void>
  
  // File operations
  addFileToProject: (projectId: string, file: Omit<ProjectFile, 'id' | 'lastModified'>) => Promise<void>
  updateFileInProject: (projectId: string, fileId: string, updates: Partial<ProjectFile>) => Promise<void>
  deleteFileFromProject: (projectId: string, fileId: string) => Promise<void>
  
  // Search and filter
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: EnhancedProjectState['sortBy']) => void
  setSortOrder: (sortOrder: EnhancedProjectState['sortOrder']) => void
  
  // Utility methods
  refreshProjects: () => Promise<void>
  getProjectStats: (projectId: string) => Promise<any>
  getGitIntegration: (projectId: string) => GitIntegration | undefined
  getTemplates: () => any[]
  
  // State management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const initialState: EnhancedProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredProjects: [],
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  gitIntegrations: new Map(),
  projectStats: new Map(),
  templates: []
}

export const useEnhancedProjectStore = create<EnhancedProjectState & EnhancedProjectActions>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        ...initialState,

        // Initialize store
        initialize: async () => {
          try {
            set({ isLoading: true, error: null })
            
            await enhancedProjectManager.initialize()
            
            const [projects, templates] = await Promise.all([
              enhancedProjectManager.getProjects(),
              enhancedProjectManager.getTemplates()
            ])
            
            // Load Git integrations and stats for each project
            const gitIntegrations = new Map<string, GitIntegration>()
            const projectStats = new Map<string, any>()
            
            for (const project of projects) {
              const gitIntegration = enhancedProjectManager.getGitIntegration(project.id)
              if (gitIntegration) {
                gitIntegrations.set(project.id, gitIntegration)
              }
              
              try {
                const stats = await enhancedProjectManager.getProjectStats(project.id)
                projectStats.set(project.id, stats)
              } catch (error) {
                console.warn(`Failed to load stats for project ${project.id}:`, error)
              }
            }
            
            set({
              projects,
              templates,
              gitIntegrations,
              projectStats,
              filteredProjects: projects,
              isLoading: false
            })
            
            console.log('✅ Enhanced project store initialized')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize enhanced project store'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Create a new project
        createProject: async (projectData) => {
          try {
            set({ isLoading: true, error: null })
            
            const project = await enhancedProjectManager.createProject(projectData)
            
            // Refresh projects list
            await get().refreshProjects()
            
            set({ isLoading: false })
            console.log(`✅ Project created: ${project.name}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Clone a Git repository as a project
        cloneGitProject: async (options) => {
          try {
            set({ isLoading: true, error: null })
            
            const project = await enhancedProjectManager.cloneGitProject(options)
            
            // Refresh projects list
            await get().refreshProjects()
            
            set({ isLoading: false })
            console.log(`✅ Git project cloned: ${project.name}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to clone Git project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Update an existing project
        updateProject: async (id: string, updates: Partial<Project>) => {
          try {
            set({ isLoading: true, error: null })
            
            const project = get().projects.find(p => p.id === id)
            if (!project) throw new Error('Project not found')

            const updatedProject = {
              ...project,
              ...updates,
              updatedAt: new Date()
            }

            // Update in enhanced project manager
            await enhancedProjectManager.updateProject(id, updates)
            
            // Refresh projects list
            await get().refreshProjects()
            
            set({ isLoading: false })
            console.log(`✅ Project updated: ${updatedProject.name}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Delete a project
        deleteProject: async (id: string) => {
          try {
            set({ isLoading: true, error: null })
            
            await enhancedProjectManager.deleteProject(id)
            
            // Refresh projects list
            await get().refreshProjects()
            
            // Clear current project if it was deleted
            if (get().currentProject?.id === id) {
              set({ currentProject: null })
            }
            
            set({ isLoading: false })
            console.log(`✅ Project deleted: ${id}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Set current project
        setCurrentProject: (project: Project | null) => {
          set({ currentProject: project })
        },

        // Git operations
        commitChanges: async (projectId: string, message: string, author?: {
          name: string
          email: string
        }) => {
          try {
            const commitId = await enhancedProjectManager.commitChanges(projectId, message, author)
            
            // Refresh Git integration and stats
            await get().syncGitStatus(projectId)
            
            // Update project timestamp
            const project = get().projects.find(p => p.id === projectId)
            if (project) {
              await get().updateProject(projectId, { updatedAt: new Date() })
            }
            
            console.log(`✅ Changes committed: ${commitId}`)
            return commitId
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to commit changes'
            set({ error: errorMessage })
            throw error
          }
        },

        pushChanges: async (projectId: string) => {
          try {
            await enhancedProjectManager.pushChanges(projectId)
            await get().syncGitStatus(projectId)
            console.log(`✅ Changes pushed for project: ${projectId}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to push changes'
            set({ error: errorMessage })
            throw error
          }
        },

        pullChanges: async (projectId: string) => {
          try {
            await enhancedProjectManager.pullChanges(projectId)
            await get().syncGitStatus(projectId)
            await get().refreshProjects() // Refresh to get updated files
            console.log(`✅ Changes pulled for project: ${projectId}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to pull changes'
            set({ error: errorMessage })
            throw error
          }
        },

        createBranch: async (projectId: string, branchName: string, startPoint?: string) => {
          try {
            await enhancedProjectManager.createBranch(projectId, branchName, startPoint)
            await get().syncGitStatus(projectId)
            console.log(`✅ Branch created: ${branchName}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create branch'
            set({ error: errorMessage })
            throw error
          }
        },

        switchBranch: async (projectId: string, branchName: string) => {
          try {
            await enhancedProjectManager.switchBranch(projectId, branchName)
            await get().syncGitStatus(projectId)
            await get().refreshProjects() // Refresh to get files from new branch
            console.log(`✅ Switched to branch: ${branchName}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to switch branch'
            set({ error: errorMessage })
            throw error
          }
        },

        getBranches: async (projectId: string) => {
          try {
            return await enhancedProjectManager.getBranches(projectId)
          } catch (error) {
            console.error('Failed to get branches:', error)
            return []
          }
        },

        getCommitHistory: async (projectId: string, options?: {
          depth?: number
          since?: Date
        }) => {
          try {
            return await enhancedProjectManager.getCommitHistory(projectId, options)
          } catch (error) {
            console.error('Failed to get commit history:', error)
            return []
          }
        },

        syncGitStatus: async (projectId: string) => {
          try {
            await enhancedProjectManager.syncGitStatus(projectId)
            
            // Update Git integration in store
            const gitIntegration = enhancedProjectManager.getGitIntegration(projectId)
            if (gitIntegration) {
              const gitIntegrations = new Map(get().gitIntegrations)
              gitIntegrations.set(projectId, gitIntegration)
              set({ gitIntegrations })
            }
            
            // Update project stats
            try {
              const stats = await enhancedProjectManager.getProjectStats(projectId)
              const projectStats = new Map(get().projectStats)
              projectStats.set(projectId, stats)
              set({ projectStats })
            } catch (error) {
              console.warn('Failed to update project stats:', error)
            }
          } catch (error) {
            console.warn('Failed to sync Git status:', error)
          }
        },

        // File operations
        addFileToProject: async (projectId: string, fileData: Omit<ProjectFile, 'id' | 'lastModified'>) => {
          try {
            const project = get().projects.find(p => p.id === projectId)
            if (!project) throw new Error('Project not found')

            const newFile: ProjectFile = {
              ...fileData,
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              lastModified: new Date()
            }

            const updatedProject = {
              ...project,
              files: [...project.files, newFile],
              updatedAt: new Date()
            }

            await get().updateProject(projectId, updatedProject)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add file to project'
            set({ error: errorMessage })
            throw error
          }
        },

        updateFileInProject: async (projectId: string, fileId: string, updates: Partial<ProjectFile>) => {
          try {
            const project = get().projects.find(p => p.id === projectId)
            if (!project) throw new Error('Project not found')

            const updatedFiles = project.files.map(file =>
              file.id === fileId
                ? { ...file, ...updates, lastModified: new Date() }
                : file
            )

            const updatedProject = {
              ...project,
              files: updatedFiles,
              updatedAt: new Date()
            }

            await get().updateProject(projectId, updatedProject)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update file in project'
            set({ error: errorMessage })
            throw error
          }
        },

        deleteFileFromProject: async (projectId: string, fileId: string) => {
          try {
            const project = get().projects.find(p => p.id === projectId)
            if (!project) throw new Error('Project not found')

            const updatedFiles = project.files.filter(file => file.id !== fileId)
            const updatedProject = {
              ...project,
              files: updatedFiles,
              updatedAt: new Date()
            }

            await get().updateProject(projectId, updatedProject)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete file from project'
            set({ error: errorMessage })
            throw error
          }
        },

        // Search and filter
        setSearchQuery: (query: string) => {
          set({ searchQuery: query })
          get().filterProjects()
        },

        setSortBy: (sortBy: EnhancedProjectState['sortBy']) => {
          set({ sortBy })
          get().sortProjects()
        },

        setSortOrder: (sortOrder: EnhancedProjectState['sortOrder']) => {
          set({ sortOrder })
          get().sortProjects()
        },

        // Refresh projects list
        refreshProjects: async () => {
          try {
            const projects = await enhancedProjectManager.getProjects()
            
            // Update Git integrations and stats
            const gitIntegrations = new Map<string, GitIntegration>()
            const projectStats = new Map<string, any>()
            
            for (const project of projects) {
              const gitIntegration = enhancedProjectManager.getGitIntegration(project.id)
              if (gitIntegration) {
                gitIntegrations.set(project.id, gitIntegration)
              }
              
              try {
                const stats = get().projectStats.get(project.id) || 
                              await enhancedProjectManager.getProjectStats(project.id)
                projectStats.set(project.id, stats)
              } catch (error) {
                console.warn(`Failed to load stats for project ${project.id}:`, error)
              }
            }
            
            set({ 
              projects, 
              gitIntegrations,
              projectStats
            })
            get().filterProjects()
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh projects'
            set({ error: errorMessage })
            throw error
          }
        },

        // Get project statistics
        getProjectStats: async (projectId: string) => {
          try {
            let stats = get().projectStats.get(projectId)
            if (!stats) {
              stats = await enhancedProjectManager.getProjectStats(projectId)
              const projectStats = new Map(get().projectStats)
              projectStats.set(projectId, stats)
              set({ projectStats })
            }
            return stats
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get project stats'
            set({ error: errorMessage })
            throw error
          }
        },

        // Get Git integration for a project
        getGitIntegration: (projectId: string) => {
          return get().gitIntegrations.get(projectId)
        },

        // Get available templates
        getTemplates: () => {
          return get().templates
        },

        // Filter projects based on search query
        filterProjects: () => {
          const { projects, searchQuery } = get()
          
          if (!searchQuery.trim()) {
            set({ filteredProjects: projects })
            get().sortProjects()
            return
          }

          const query = searchQuery.toLowerCase()
          const filtered = projects.filter(project =>
            project.name.toLowerCase().includes(query) ||
            project.description.toLowerCase().includes(query) ||
            project.type.toLowerCase().includes(query)
          )

          set({ filteredProjects: filtered })
          get().sortProjects()
        },

        // Sort projects based on current criteria
        sortProjects: () => {
          const { filteredProjects, sortBy, sortOrder } = get()
          
          const sorted = [...filteredProjects].sort((a, b) => {
            let comparison = 0
            
            switch (sortBy) {
              case 'name':
                comparison = a.name.localeCompare(b.name)
                break
              case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                break
              case 'updatedAt':
                comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
                break
              case 'progress':
                comparison = a.progress - b.progress
                break
            }
            
            return sortOrder === 'asc' ? comparison : -comparison
          })

          set({ filteredProjects: sorted })
        },

        // State management
        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },

        setError: (error: string | null) => {
          set({ error })
        }
      })
    ),
    {
      name: 'enhanced-project-store'
    }
  )
)

// Auto-initialize the store
if (typeof window !== 'undefined') {
  useEnhancedProjectStore.getState().initialize().catch(console.error)
}