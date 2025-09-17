import React, { useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { 
  Folder, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  Code,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    type: 'react-native' | 'web' | 'node' | 'python' | 'ai-service'
    status: 'active' | 'paused' | 'completed' | 'archived'
    progress: number
    createdAt: Date
    updatedAt: Date
    files: Array<any>
  }
  onSelect: (project: any) => void
}

function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500'
      case 'paused': return 'text-yellow-500'
      case 'completed': return 'text-blue-500'
      case 'archived': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return '🌐'
      case 'react-native': return '📱'
      case 'node': return '🖥️'
      case 'python': return '🐍'
      case 'ai-service': return '🤖'
      default: return '📁'
    }
  }

  return (
    <div 
      className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getTypeIcon(project.type)}</span>
          <div>
            <h3 className="font-semibold">{project.name}</h3>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Status and Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            <Badge variant="outline" className="text-xs">
              {project.type}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
              <span>{project.files?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const {
    projects,
    filteredProjects,
    currentProject,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    setCurrentProject,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    createProject
  } = useProjectStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    type: 'web' as const,
    templateId: ''
  })

  const handleCreateProject = async () => {
    if (!newProjectData.name.trim()) return

    try {
      await createProject({ ...newProjectData, templateId: newProjectData.templateId || undefined })
      setNewProjectData({ name: '', description: '', type: 'web', templateId: '' })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
            <Folder className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center mx-auto">
            <Folder className="w-6 h-6 text-destructive-foreground" />
          </div>
          <p className="text-destructive font-medium">Error loading projects</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage your development projects
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Created Date</option>
            <option value="name">Name</option>
            <option value="progress">Progress</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search terms.' : 'Create your first project to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={(p) => setCurrentProject(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-blue-500">{projects.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-green-500">
            {projects.filter(p => p.status === 'active').length}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-purple-500">
            {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%
          </p>
          <p className="text-xs text-muted-foreground">Avg Progress</p>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div>
              <h2 className="text-xl font-bold">Create New Project</h2>
              <p className="text-muted-foreground">Set up a new development project</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project Name</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  placeholder="Describe your project..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Project Type</label>
                <select
                  value={newProjectData.type}
                  onChange={(e) => setNewProjectData({ ...newProjectData, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="web">Web Application</option>
                  <option value="react-native">React Native</option>
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="ai-service">AI Service</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectData.name.trim()}
                className="flex-1"
              >
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage;