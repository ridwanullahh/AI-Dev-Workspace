import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { useWorkspaceStore } from './workspaceStore'
import type { Project, ProjectFile } from '../types'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filteredProjects: Project[]
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'progress'
  sortOrder: 'asc' | 'desc'
}

interface ProjectActions {
  createProject: (projectData: {
    name: string
    description: string
    type: Project['type']
    templateId?: string
  }) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: ProjectState['sortBy']) => void
  setSortOrder: (sortOrder: ProjectState['sortOrder']) => void
  addFileToProject: (projectId: string, file: Omit<ProjectFile, 'id' | 'lastModified'>) => Promise<void>
  updateFileInProject: (projectId: string, fileId: string, updates: Partial<ProjectFile>) => Promise<void>
  deleteFileFromProject: (projectId: string, fileId: string) => Promise<void>
  refreshProjects: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void;
  filterProjects: () => void;
  sortProjects: () => void;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredProjects: [],
  sortBy: 'updatedAt',
  sortOrder: 'desc'
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        ...initialState,

        // Create a new project
        createProject: async (projectData) => {
          try {
            set({ isLoading: true, error: null })
            
            const { addProject } = useWorkspaceStore.getState()
            await addProject({
              ...projectData,
              status: 'active',
              progress: 0,
            })
            
            // Refresh projects list
            await get().refreshProjects()
            
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Update an existing project
        updateProject: async (id: string, updates: Partial<Project>) => {
          try {
            set({ isLoading: true, error: null })
            
            const { updateProject } = useWorkspaceStore.getState()
            await updateProject(id, updates)
            
            // Refresh projects list
            await get().refreshProjects()
            
            set({ isLoading: false })
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
            
            const { deleteProject } = useWorkspaceStore.getState()
            await deleteProject(id)
            
            // Refresh projects list
            await get().refreshProjects()
            
            // Clear current project if it was deleted
            if (get().currentProject?.id === id) {
              set({ currentProject: null })
            }
            
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete project'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        // Set current project
        setCurrentProject: (project: Project | null) => {
          const { setCurrentProject } = useWorkspaceStore.getState()
          setCurrentProject(project)
          set({ currentProject: project })
        },

        // Set search query for filtering projects
        setSearchQuery: (query: string) => {
          set({ searchQuery: query })
          get().filterProjects()
        },

        // Set sort criteria
        setSortBy: (sortBy: ProjectState['sortBy']) => {
          set({ sortBy })
          get().sortProjects()
        },

        // Set sort order
        setSortOrder: (sortOrder: ProjectState['sortOrder']) => {
          set({ sortOrder })
          get().sortProjects()
        },

        // Add file to project
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

        // Update file in project
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

        // Delete file from project
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

        // Refresh projects list
        refreshProjects: async () => {
          try {
            const { projects } = useWorkspaceStore.getState()
            set({ projects })
            get().filterProjects()
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh projects'
            set({ error: errorMessage })
            throw error
          }
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

        // Set loading state
        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },

        // Set error state
        setError: (error: string | null) => {
          set({ error })
        }
      })
    ),
    {
      name: 'project-store'
    }
  )
)

// Subscribe to workspace projects and sync with project store
useWorkspaceStore.subscribe((state) => {
  const projectStore = useProjectStore.getState()
  useProjectStore.setState({ projects: state.projects, filteredProjects: state.projects })
  projectStore.filterProjects()
})