import React, { useState, useEffect } from 'react'
import { useEnhancedProjectStore } from '@/stores/enhancedProjectStore'
import { 
  Folder, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  Code,
  TrendingUp,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Trash2,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  gitIntegration?: any
  stats?: any
  onSelect: (project: any) => void
  onGitAction: (action: string, projectId: string) => void
}

function ProjectCard({ project, gitIntegration, stats, onSelect, onGitAction }: ProjectCardProps) {
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

  const getGitStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-500'
      case 'ahead': return 'text-blue-500'
      case 'behind': return 'text-orange-500'
      case 'diverged': return 'text-red-500'
      case 'disconnected': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const getGitStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle className="h-4 w-4" />
      case 'ahead': return <Upload className="h-4 w-4" />
      case 'behind': return <Download className="h-4 w-4" />
      case 'diverged': return <GitMerge className="h-4 w-4" />
      case 'disconnected': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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
          <div className="flex-1">
            <h3 className="font-semibold truncate">{project.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {gitIntegration && (
            <div className={`flex items-center gap-1 text-xs ${getGitStatusColor(gitIntegration.status)}`}>
              {getGitStatusIcon(gitIntegration.status)}
              <span>{gitIntegration.status}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation()
            // Show project menu
          }}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
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
            {gitIntegration && (
              <div className="flex items-center gap-1">
                <GitCommit className="h-3 w-3" />
                <span>{gitIntegration.commitCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Git Integration Info */}
        {gitIntegration && (
          <div className="bg-muted/50 rounded-lg p-2 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Git Repository</span>
              <Badge variant="outline" className="text-xs">
                {gitIntegration.branch}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{gitIntegration.isCloned ? 'Cloned' : 'Local'}</span>
              <div className="flex items-center gap-2">
                {gitIntegration.untrackedFiles > 0 && (
                  <span className="text-orange-500">
                    {gitIntegration.untrackedFiles} untracked
                  </span>
                )}
                {gitIntegration.modifiedFiles > 0 && (
                  <span className="text-red-500">
                    {gitIntegration.modifiedFiles} modified
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {gitIntegration && (
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onGitAction('commit', project.id)
              }}
              disabled={gitIntegration.untrackedFiles === 0 && gitIntegration.modifiedFiles === 0}
            >
              <GitCommit className="h-3 w-3 mr-1" />
              Commit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onGitAction('push', project.id)
              }}
              disabled={gitIntegration.status === 'synced' || !gitIntegration.remoteUrl}
            >
              <Upload className="h-3 w-3 mr-1" />
              Push
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onGitAction('pull', project.id)
              }}
              disabled={!gitIntegration.remoteUrl}
            >
              <Download className="h-3 w-3 mr-1" />
              Pull
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EnhancedProjectsPage() {
  const {
    projects,
    filteredProjects,
    currentProject,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    templates,
    setCurrentProject,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    createProject,
    cloneGitProject,
    deleteProject,
    commitChanges,
    pushChanges,
    pullChanges,
    syncGitStatus,
    getGitIntegration,
    getProjectStats
  } = useEnhancedProjectStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [showGitActionModal, setShowGitActionModal] = useState(false)
  const [selectedProjectForGit, setSelectedProjectForGit] = useState<string | null>(null)
  const [gitActionType, setGitActionType] = useState<'commit' | 'push' | 'pull'>('commit')
  const [commitMessage, setCommitMessage] = useState('')

  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    type: 'web' as const,
    templateId: '',
    git: {
      initialize: false,
      remoteUrl: '',
      credentials: {
        username: '',
        token: ''
      }
    }
  })

  const [cloneData, setCloneData] = useState({
    name: '',
    description: '',
    gitUrl: '',
    branch: 'main',
    credentials: {
      username: '',
      token: ''
    }
  })

  const handleCreateProject = async () => {
    if (!newProjectData.name.trim()) return

    try {
      await createProject({
        name: newProjectData.name,
        description: newProjectData.description,
        type: newProjectData.type,
        templateId: newProjectData.templateId || undefined,
        initializeGit: newProjectData.git.initialize,
        gitRemoteUrl: newProjectData.git.remoteUrl,
        gitCredentials: newProjectData.git.credentials,
      })
      setNewProjectData({
        name: '',
        description: '',
        type: 'web',
        templateId: '',
        git: {
          initialize: false,
          remoteUrl: '',
          credentials: {
            username: '',
            token: ''
          }
        }
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleCloneProject = async () => {
    if (!cloneData.name.trim() || !cloneData.gitUrl.trim()) return

    try {
      await cloneGitProject({
        name: cloneData.name,
        description: cloneData.description,
        gitUrl: cloneData.gitUrl,
        branch: cloneData.branch || undefined,
        credentials: cloneData.credentials.token ? {
          username: cloneData.credentials.username,
          token: cloneData.credentials.token
        } : undefined
      })
      setCloneData({
        name: '',
        description: '',
        gitUrl: '',
        branch: 'main',
        credentials: { username: '', token: '' }
      })
      setShowCloneModal(false)
    } catch (error) {
      console.error('Failed to clone project:', error)
    }
  }

  const handleGitAction = async () => {
    if (!selectedProjectForGit) return

    try {
      switch (gitActionType) {
        case 'commit':
          if (commitMessage.trim()) {
            await commitChanges(selectedProjectForGit, commitMessage)
            setCommitMessage('')
          }
          break
        case 'push':
          await pushChanges(selectedProjectForGit)
          break
        case 'pull':
          await pullChanges(selectedProjectForGit)
          break
      }
      setShowGitActionModal(false)
      setSelectedProjectForGit(null)
    } catch (error) {
      console.error('Failed to perform Git action:', error)
    }
  }

  const onGitAction = (action: string, projectId: string) => {
    setGitActionType(action as 'commit' | 'push' | 'pull')
    setSelectedProjectForGit(projectId)
    setShowGitActionModal(true)
  }

  // Sync Git status for all projects periodically
  useEffect(() => {
    const interval = setInterval(() => {
      projects.forEach(project => {
        syncGitStatus(project.id)
      })
    }, 30000) // Sync every 30 seconds

    return () => clearInterval(interval)
  }, [projects])

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
              Manage your development projects with Git integration
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCloneModal(true)} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Clone
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
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
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
                <Button onClick={() => setShowCloneModal(true)} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Clone Repository
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const gitIntegration = getGitIntegration(project.id)
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  gitIntegration={gitIntegration}
                  stats={undefined} // We can add stats later
                  onSelect={(p) => setCurrentProject(p)}
                  onGitAction={onGitAction}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-blue-500">{projects.length}</p>
          <p className="text-xs text-muted-foreground">Total Projects</p>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-green-500">
            {projects.filter(p => p.status === 'active').length}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-purple-500">
            {projects.filter(p => getGitIntegration(p.id)).length}
          </p>
          <p className="text-xs text-muted-foreground">With Git</p>
        </div>
        <div className="bg-card p-3 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-orange-500">
            {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%
          </p>
          <p className="text-xs text-muted-foreground">Avg Progress</p>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h2 className="text-xl font-bold">Create New Project</h2>
              <p className="text-muted-foreground">Set up a new development project</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project Name</label>
                <Input
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  placeholder="Enter project name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Project Type</label>
                <Select
                  value={newProjectData.type}
                  onValueChange={(value) => setNewProjectData({ ...newProjectData, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web Application</SelectItem>
                    <SelectItem value="react-native">React Native</SelectItem>
                    <SelectItem value="node">Node.js</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="ai-service">AI Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Template (Optional)</label>
                <Select
                  value={newProjectData.templateId}
                  onValueChange={(value) => setNewProjectData({ ...newProjectData, templateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Template</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="initializeGit"
                    checked={newProjectData.git.initialize}
                    onChange={(e) => setNewProjectData({ ...newProjectData, git: { ...newProjectData.git, initialize: e.target.checked } })}
                    className="rounded"
                  />
                  <label htmlFor="initializeGit" className="text-sm font-medium">
                    Initialize Git Repository
                  </label>
                </div>

                {newProjectData.git.initialize && (
                  <div className="space-y-3 pl-6 border-l-2 border-border">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Remote URL (Optional)</label>
                      <Input
                        value={newProjectData.git.remoteUrl}
                        onChange={(e) => setNewProjectData({ ...newProjectData, git: { ...newProjectData.git, remoteUrl: e.target.value } })}
                        placeholder="https://github.com/username/repo.git"
                      />
                    </div>

                    {(newProjectData.git.remoteUrl || newProjectData.git.initialize) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium mb-2 block">Git Credentials (Optional)</label>
                        <Input
                          placeholder="Username"
                          value={newProjectData.git.credentials.username}
                          onChange={(e) => setNewProjectData({
                            ...newProjectData,
                            git: { ...newProjectData.git, credentials: { ...newProjectData.git.credentials, username: e.target.value } }
                          })}
                        />
                        <Input
                          placeholder="Personal Access Token"
                          type="password"
                          value={newProjectData.git.credentials.token}
                          onChange={(e) => setNewProjectData({
                            ...newProjectData,
                            git: { ...newProjectData.git, credentials: { ...newProjectData.git.credentials, token: e.target.value } }
                          })}
                        />
                      </div>
                    )}
                  </div>
                )}
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

      {/* Clone Project Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div>
              <h2 className="text-xl font-bold">Clone Git Repository</h2>
              <p className="text-muted-foreground">Clone an existing repository as a new project</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project Name</label>
                <Input
                  value={cloneData.name}
                  onChange={(e) => setCloneData({ ...cloneData, name: e.target.value })}
                  placeholder="Enter project name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={cloneData.description}
                  onChange={(e) => setCloneData({ ...cloneData, description: e.target.value })}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Git Repository URL</label>
                <Input
                  value={cloneData.gitUrl}
                  onChange={(e) => setCloneData({ ...cloneData, gitUrl: e.target.value })}
                  placeholder="https://github.com/username/repo.git"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Branch (Optional)</label>
                <Input
                  value={cloneData.branch}
                  onChange={(e) => setCloneData({ ...cloneData, branch: e.target.value })}
                  placeholder="main"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium mb-2 block">Git Credentials (Optional)</label>
                <Input
                  placeholder="Username"
                  value={cloneData.credentials.username}
                  onChange={(e) => setCloneData({
                    ...cloneData,
                    credentials: { ...cloneData.credentials, username: e.target.value }
                  })}
                />
                <Input
                  placeholder="Personal Access Token"
                  type="password"
                  value={cloneData.credentials.token}
                  onChange={(e) => setCloneData({
                    ...cloneData,
                    credentials: { ...cloneData.credentials, token: e.target.value }
                  })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCloneModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloneProject}
                disabled={!cloneData.name.trim() || !cloneData.gitUrl.trim()}
                className="flex-1"
              >
                Clone Repository
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Git Action Modal */}
      {showGitActionModal && selectedProjectForGit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div>
              <h2 className="text-xl font-bold">
                {gitActionType === 'commit' && 'Commit Changes'}
                {gitActionType === 'push' && 'Push Changes'}
                {gitActionType === 'pull' && 'Pull Changes'}
              </h2>
              <p className="text-muted-foreground">
                {gitActionType === 'commit' && 'Commit your changes to the repository'}
                {gitActionType === 'push' && 'Push your commits to the remote repository'}
                {gitActionType === 'pull' && 'Pull latest changes from the remote repository'}
              </p>
            </div>
            
            {gitActionType === 'commit' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Commit Message</label>
                <Textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe your changes..."
                  rows={3}
                />
              </div>
            )}

            {gitActionType === 'push' && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  This will push all committed changes to the remote repository.
                </p>
              </div>
            )}

            {gitActionType === 'pull' && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  This will pull the latest changes from the remote repository. 
                  Any local changes will be preserved.
                </p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGitActionModal(false)
                  setSelectedProjectForGit(null)
                  setCommitMessage('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGitAction}
                disabled={gitActionType === 'commit' && !commitMessage.trim()}
                className="flex-1"
              >
                {gitActionType === 'commit' && 'Commit'}
                {gitActionType === 'push' && 'Push'}
                {gitActionType === 'pull' && 'Pull'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedProjectsPage;