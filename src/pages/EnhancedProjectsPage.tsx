import React, { useState, useEffect } from 'react';
import { db } from '@/database/schema';
import type { Project } from '@/database/schema';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { GitHubSyncUI } from '@/components/GitHubSyncUI';
import { GitHubRepoSelector } from '@/components/GitHubRepoSelector';
import {
  Folder,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  GitBranch,
  GitCommit,
  CheckCircle,
  AlertCircle,
  Trash2,
  Settings as SettingsIcon,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function EnhancedProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showGitSync, setShowGitSync] = useState(false);
  const [showRepoSelector, setShowRepoSelector] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = (project: Project) => {
    loadProjects();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await db.projects.delete(projectId);
      
      // Delete associated data
      await db.files.where('projectId').equals(projectId).delete();
      await db.chats.where('projectId').equals(projectId).delete();
      await db.commits.where('projectId').equals(projectId).delete();
      await db.todos.where('projectId').equals(projectId).delete();
      
      loadProjects();
      alert('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const handleConnectGitHub = async (project: Project, repo: any) => {
    try {
      await db.projects.update(project.id, {
        'gitConfig.isConnected': true,
        'gitConfig.remoteUrl': repo.clone_url,
        'gitConfig.githubRepoId': repo.id,
        'gitConfig.githubRepoName': repo.name,
        'gitConfig.githubRepoFullName': repo.full_name,
      });
      loadProjects();
      setShowRepoSelector(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to connect GitHub repository:', error);
      alert('Failed to connect GitHub repository');
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return '🌐';
      case 'mobile': return '📱';
      case 'api': return '🖥️';
      case 'library': return '📦';
      default: return '📁';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'archived': return 'text-gray-500';
      case 'template': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (showGitSync && selectedProject) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
            <p className="text-sm text-muted-foreground">GitHub Sync</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowGitSync(false);
              setSelectedProject(null);
            }}
          >
            Back to Projects
          </Button>
        </div>
        
        <GitHubSyncUI
          projectId={selectedProject.id}
          project={selectedProject}
          onRefresh={loadProjects}
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(project.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.description || 'No description'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Status and Type */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {project.type}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getStatusColor(project.status)}`}>
                  {project.status}
                </Badge>
                {project.gitConfig?.isConnected && (
                  <Badge variant="outline" className="text-xs">
                    <GitBranch className="h-3 w-3 mr-1" />
                    GitHub
                  </Badge>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                {project.metadata?.framework && (
                  <span>{project.metadata.framework}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Folder className="h-4 w-4 mr-2" />
                  Open
                </Button>
                {project.gitConfig?.isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowGitSync(true);
                    }}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowRepoSelector(true);
                    }}
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              {/* Git Status */}
              {project.gitConfig?.isConnected && project.gitConfig.lastSync && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>
                      Last synced: {new Date(project.gitConfig.lastSync).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg p-12 border border-border text-center">
          <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first project to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateProject}
        />
      )}

      {showRepoSelector && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Connect GitHub Repository</h2>
            <GitHubRepoSelector
              onSelectRepo={(repo) => handleConnectGitHub(selectedProject, repo)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setShowRepoSelector(false);
                setSelectedProject(null);
              }}
              className="mt-4 w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedProjectsPage;
