import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, type Project } from '@/database/schema';
import {
  Folder,
  Terminal as TerminalIcon,
  GitBranch,
  MessageSquare,
  Settings,
  ArrowLeft,
  Save,
  Play,
  RefreshCw,
  ChevronRight,
  FileText,
  Code2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChatThreadManager } from '@/components/ChatThreadManager';
import { GitStagingArea } from '@/components/GitStagingArea';
import { GitHistory } from '@/components/GitHistory';
import { BranchManager } from '@/components/BranchManager';
import { FloatingActionButton, projectActions } from '@/components/FloatingActionButton';

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('files');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [showGitHistory, setShowGitHistory] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      const proj = await db.projects.get(projectId);
      if (proj) {
        setProject(proj);
        // Check sync status
        if (proj.gitConfig?.isConnected && proj.gitConfig?.lastSync) {
          const timeSinceSync = Date.now() - new Date(proj.gitConfig.lastSync).getTime();
          setSyncStatus(timeSinceSync < 60000 ? 'synced' : 'idle');
        }
      } else {
        navigate('/projects');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!project?.gitConfig?.isConnected) return;
    
    setSyncStatus('syncing');
    // Implement actual sync logic here
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 2000);
  };

  const handleClose = () => {
    // Save current state before closing
    navigate('/projects');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Project Header */}
      <div className="border-b border-border bg-card">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {project.gitConfig?.isConnected && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      <GitBranch className="h-3 w-3 mr-1" />
                      {project.gitConfig.branch || 'main'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSync}
                      disabled={syncStatus === 'syncing'}
                      className="h-6 px-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    </Button>
                  </>
                )}
                {syncStatus === 'synced' && (
                  <span className="text-xs text-green-500">Synced</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b-0 bg-transparent">
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
              <TabsTrigger value="terminal" className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Terminal</span>
              </TabsTrigger>
              <TabsTrigger value="git" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Git</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} className="h-full">
          {/* Files Tab */}
          <TabsContent value="files" className="m-0 h-full">
            <div className="p-4 h-full">
              <div className="bg-card rounded-lg border border-border p-8 text-center h-full flex flex-col items-center justify-center">
                <Folder className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">File Explorer</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Browse and edit project files
                </p>
                <div className="space-y-2 w-full max-w-md">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="flex-1 text-sm">README.md</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                    <Code2 className="h-5 w-5 text-green-500" />
                    <span className="flex-1 text-sm">src/</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer">
                    <Database className="h-5 w-5 text-purple-500" />
                    <span className="flex-1 text-sm">package.json</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Terminal Tab */}
          <TabsContent value="terminal" className="m-0 h-full">
            <div className="p-4 h-full">
              <div className="bg-black rounded-lg p-4 h-full font-mono text-sm">
                <div className="text-green-400">
                  $ Welcome to {project.name} terminal
                </div>
                <div className="text-gray-400 mt-2">
                  Type your commands here...
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-blue-400">$</span>
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Git Tab */}
          <TabsContent value="git" className="m-0 h-full">
            {showBranchManager ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">Branch Manager</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowBranchManager(false)}>
                    Back to Staging
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <BranchManager
                    projectId={project.id}
                    currentBranch={project.gitConfig?.branch || 'main'}
                    onBranchChange={async (branchName) => {
                      await db.projects.update(project.id, {
                        'gitConfig.branch': branchName
                      });
                      await loadProject();
                    }}
                  />
                </div>
              </div>
            ) : showGitHistory ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">Commit History</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowBranchManager(true)}>
                      Branches
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowGitHistory(false)}>
                      Back to Staging
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <GitHistory projectId={project.id} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">Git Operations</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowBranchManager(true)}>
                      Branches
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowGitHistory(true)}>
                      History
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <GitStagingArea
                    projectId={project.id}
                    onCommit={async (message, files) => {
                      // Implement commit logic
                      console.log('Committing:', message, files);
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="m-0 h-full">
            <ChatThreadManager
              projectId={project.id}
              activeThreadId={activeThreadId}
              onSelectThread={(threadId) => setActiveThreadId(threadId)}
              onCreateThread={() => {
                const newThreadId = `thread_${Date.now()}`;
                setActiveThreadId(newThreadId);
              }}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="m-0 h-full">
            <div className="p-4 h-full overflow-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                      <label className="text-sm font-medium mb-2 block">Project Name</label>
                      <input
                        type="text"
                        value={project.name}
                        readOnly
                        className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                      />
                    </div>

                    <div className="bg-card rounded-lg border border-border p-4">
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <textarea
                        value={project.description}
                        readOnly
                        className="w-full px-3 py-2 bg-muted rounded-md text-sm h-20 resize-none"
                      />
                    </div>

                    <div className="bg-card rounded-lg border border-border p-4">
                      <label className="text-sm font-medium mb-2 block">Project Type</label>
                      <Badge>{project.type}</Badge>
                    </div>

                    <div className="bg-card rounded-lg border border-border p-4">
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>

                    {project.metadata?.framework && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <label className="text-sm font-medium mb-2 block">Framework</label>
                        <span className="text-sm">{project.metadata.framework}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={projectActions}
        context="project"
      />
    </div>
  );
}

export default ProjectWorkspacePage;
