import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/database/schema';
import type { Project } from '@/database/schema';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { GitHubSyncUI } from '@/components/GitHubSyncUI';
import { GitHubRepoSelector } from '@/components/GitHubRepoSelector';
import {
  Folder,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonProjectGrid } from '@/components/SkeletonLoader';
import { ProjectCard } from '@/components/ProjectCard';

export function EnhancedProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showGitSync, setShowGitSync] = useState(false);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [sortBy, setSortBy] = useState('updated');
  const [filterType, setFilterType] = useState('all');
  const [filterGit, setFilterGit] = useState('all');

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

  let filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || p.type === filterType;
    
    const matchesGit = filterGit === 'all' ||
      (filterGit === 'connected' && p.gitConfig?.isConnected) ||
      (filterGit === 'disconnected' && !p.gitConfig?.isConnected);

    return matchesSearch && matchesType && matchesGit;
  });

  // Apply sorting
  filteredProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'created') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  });

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

      {/* Sorting and Filtering */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently Updated</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="web">Web Apps</SelectItem>
            <SelectItem value="mobile">Mobile Apps</SelectItem>
            <SelectItem value="api">APIs</SelectItem>
            <SelectItem value="library">Libraries</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterGit} onValueChange={setFilterGit}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="GitHub status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Not Connected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <SkeletonProjectGrid count={6} />
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
              onSync={(p) => {
                setSelectedProject(p);
                setShowGitSync(true);
              }}
              onConnect={(p) => {
                setSelectedProject(p);
                setShowRepoSelector(true);
              }}
            />
          ))}
        </div>
      ) : searchQuery || filterType !== 'all' || filterGit !== 'all' ? (
        <div className="bg-card rounded-lg p-12 border border-border text-center">
          <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search or filters
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setFilterGit('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg p-12 border-2 border-dashed border-border text-center">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Create Your First Project</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start building something amazing with AI-powered development tools. 
            Choose from templates or start from scratch.
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Project
          </Button>
          
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🚀</div>
              <p className="text-sm font-medium mb-1">Quick Start</p>
              <p className="text-xs text-muted-foreground">
                Use templates to get started in seconds
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm font-medium mb-1">AI-Powered</p>
              <p className="text-xs text-muted-foreground">
                Get help from specialized AI agents
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🔄</div>
              <p className="text-sm font-medium mb-1">Git Integration</p>
              <p className="text-xs text-muted-foreground">
                Seamless GitHub sync and collaboration
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-sm font-medium mb-1">Mobile-First</p>
              <p className="text-xs text-muted-foreground">
                Code anywhere, on any device
              </p>
            </div>
          </div>
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
