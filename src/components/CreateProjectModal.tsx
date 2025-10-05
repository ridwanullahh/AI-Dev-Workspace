import React, { useState } from 'react';
import { db } from '@/database/schema';
import type { Project } from '@/database/schema';
import { GitHubRepoSelector } from '@/components/GitHubRepoSelector';
import { templateManager } from '../services/templateManager';
import { 
  Folder, 
  Github, 
  FileText, 
  Smartphone, 
  Globe, 
  Server, 
  Package,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

const PROJECT_TYPES = [
  { id: 'web', label: 'Web App', icon: Globe, description: 'React, Vue, or vanilla web application' },
  { id: 'mobile', label: 'Mobile App', icon: Smartphone, description: 'React Native or mobile PWA' },
  { id: 'api', label: 'API/Backend', icon: Server, description: 'REST API, GraphQL, or backend service' },
  { id: 'library', label: 'Library/Package', icon: Package, description: 'NPM package or reusable library' },
  { id: 'other', label: 'Other', icon: FileText, description: 'Custom project type' },
];

const TEMPLATES = [
  { id: 'blank', name: 'Blank Project', description: 'Start from scratch', framework: null },
  { id: 'react-vite', name: 'React + Vite', description: 'Modern React setup with Vite', framework: 'react' },
  { id: 'react-native', name: 'React Native', description: 'Mobile app with Expo', framework: 'react-native' },
  { id: 'nextjs', name: 'Next.js', description: 'Full-stack React framework', framework: 'nextjs' },
  { id: 'express', name: 'Express.js', description: 'Node.js backend API', framework: 'express' },
  { id: 'fastapi', name: 'FastAPI', description: 'Python API framework', framework: 'fastapi' },
];

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState<'details' | 'type' | 'github'>('details');
  const [isLoading, setIsLoading] = useState(false);
  
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<'web' | 'mobile' | 'api' | 'library' | 'other'>('web');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [createMethod, setCreateMethod] = useState<'local' | 'github' | 'clone' | 'template'>('local');
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [initGit, setInitGit] = useState(true);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      setIsLoading(true);

      const project: Project = {
        id: `project_${Date.now()}`,
        name: projectName.trim(),
        description: description.trim(),
        type: projectType,
        status: 'active',
        gitConfig: {
          localPath: `/projects/${projectName.trim().toLowerCase().replace(/\s+/g, '-')}`,
          remoteUrl: selectedRepo?.clone_url,
          branch: selectedRepo?.default_branch || 'main',
          lastSync: new Date(),
          githubRepoId: selectedRepo?.id,
          githubRepoName: selectedRepo?.name,
          githubRepoFullName: selectedRepo?.full_name,
          isConnected: !!selectedRepo
        },
        settings: {
          aiProvider: 'gemini',
          agents: ['architect', 'coder', 'debugger'],
          features: ['git', 'ai-assist', 'terminal']
        },
        metadata: {
          tags: [],
          framework: TEMPLATES.find(t => t.id === selectedTemplate)?.framework || undefined,
          language: projectType === 'api' ? 'node' : 'javascript',
          size: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.projects.add(project);
      
      await templateManager.createProjectFromTemplate(project, selectedTemplate);

      // If GitHub repo is selected, mark it as connected in settings
      if (selectedRepo) {
        await db.settings.put({
          id: `project_${project.id}_github_connected`,
          category: 'git',
          key: 'github_connected',
          value: true,
          encrypted: false,
          updatedAt: new Date()
        });
      }

      onSuccess(project);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-2xl font-bold">Create New Project</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up a new project with or without GitHub integration
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Creation Method */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Creation Method</label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={createMethod === 'local' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('local')}
                className="flex flex-col h-24 justify-center"
              >
                <Folder className="h-6 w-6 mb-2" />
                <span className="text-xs">Local Project</span>
              </Button>
              <Button
                variant={createMethod === 'github' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('github')}
                className="flex flex-col h-24 justify-center"
              >
                <Github className="h-6 w-6 mb-2" />
                <span className="text-xs">From GitHub</span>
              </Button>
              <Button
                variant={createMethod === 'clone' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('clone')}
                className="flex flex-col h-24 justify-center"
              >
                <Package className="h-6 w-6 mb-2" />
                <span className="text-xs">Clone Repo</span>
              </Button>
              <Button
                variant={createMethod === 'template' ? 'default' : 'outline'}
                onClick={() => setCreateMethod('template')}
                className="flex flex-col h-24 justify-center"
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-xs">From Template</span>
              </Button>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name *</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome Project"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="text-sm font-medium mb-3 block">Project Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PROJECT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      variant={projectType === type.id ? 'default' : 'outline'}
                      onClick={() => setProjectType(type.id as any)}
                      className="flex flex-col h-20 justify-center"
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Template Selection (only for local projects) */}
            {(createMethod === 'local' || createMethod === 'template') && (
              <div>
                <label className="text-sm font-medium mb-3 block">Template</label>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate === template.id ? 'default' : 'outline'}
                      onClick={() => setSelectedTemplate(template.id)}
                      className="flex flex-col h-auto p-4 items-start text-left"
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </span>
                      {template.framework && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {template.framework}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub Repository Selection */}
            {(createMethod === 'github' || createMethod === 'clone') && (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {createMethod === 'github' ? 'Select Repository' : 'Repository to Clone'}
                </label>
                <GitHubRepoSelector
                  onSelectRepo={(repo) => {
                    setSelectedRepo(repo);
                    if (!projectName) {
                      setProjectName(repo.name);
                    }
                    if (!description && repo.description) {
                      setDescription(repo.description);
                    }
                  }}
                />
                {selectedRepo && (
                  <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">
                      Selected: {selectedRepo.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedRepo.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Git Initialization (only for local projects) */}
            {createMethod === 'local' && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <input
                  type="checkbox"
                  id="init-git"
                  checked={initGit}
                  onChange={(e) => setInitGit(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="init-git" className="text-sm cursor-pointer">
                  Initialize Git repository
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!projectName.trim() || isLoading || (createMethod !== 'local' && !selectedRepo)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
