import React, { useState, useEffect } from 'react';
import { githubSync } from '../services/githubSync';
import { db } from '@/database/schema';
import type { Project } from '@/database/schema';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GitHubSyncUIProps {
  projectId: string;
  project: Project;
  onRefresh?: () => void;
}

export function GitHubSyncUI({ projectId, project, onRefresh }: GitHubSyncUIProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'ahead' | 'behind' | 'diverged' | 'disconnected'>('disconnected');
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [currentBranch, setCurrentBranch] = useState(project.gitConfig.branch);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    loadGitStatus();
  }, [projectId]);

  const loadGitStatus = async () => {
    try {
      setIsLoading(true);

      // Check if project is connected to GitHub
      if (!project.gitConfig.isConnected) {
        setSyncStatus('disconnected');
        return;
      }

      // Load modified files
      const files = await db.files
        .where('projectId')
        .equals(projectId)
        .and(f => f.isDirty)
        .toArray();
      setModifiedFiles(files.map(f => f.path));

      // Load commits
      const projectCommits = await db.commits
        .where('projectId')
        .equals(projectId)
        .reverse()
        .limit(10)
        .toArray();
      setCommits(projectCommits);

      // Load pull requests if connected
      if (project.gitConfig.remoteUrl) {
        try {
          const prs = await githubSync.getPullRequests(projectId);
          setPullRequests(prs);
        } catch (error) {
          console.error('Failed to load PRs:', error);
        }
      }

      // Determine sync status
      const hasLocalChanges = files.length > 0;
      const hasRemoteChanges = await githubSync.checkRemoteChanges(projectId);
      
      if (!hasLocalChanges && !hasRemoteChanges) {
        setSyncStatus('synced');
      } else if (hasLocalChanges && !hasRemoteChanges) {
        setSyncStatus('ahead');
      } else if (!hasLocalChanges && hasRemoteChanges) {
        setSyncStatus('behind');
      } else {
        setSyncStatus('diverged');
      }

      // Check for conflicts
      const projectConflicts = await githubSync.getConflicts(projectId);
      setConflicts(projectConflicts);
    } catch (error) {
      console.error('Failed to load git status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      setIsLoading(true);

      // Create commit
      const commit = {
        id: `commit_${Date.now()}`,
        projectId,
        hash: `${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`,
        message: commitMessage.trim(),
        author: 'User',
        timestamp: new Date(),
        files: modifiedFiles,
        parentHashes: commits.length > 0 ? [commits[0].hash] : []
      };

      await db.commits.add(commit);

      // Mark files as clean
      for (const filePath of modifiedFiles) {
        const file = await db.files
          .where({ projectId, path: filePath })
          .first();
        if (file) {
          await db.files.update(file.id, { isDirty: false, isStaged: false });
        }
      }

      setCommitMessage('');
      setShowCommitModal(false);
      await loadGitStatus();
      onRefresh?.();
      
      alert('Changes committed successfully!');
    } catch (error) {
      console.error('Failed to commit:', error);
      alert('Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    if (!project.gitConfig.remoteUrl) {
      alert('No remote repository configured');
      return;
    }

    try {
      setIsLoading(true);
      await githubSync.syncProjectToGitHub(projectId);
      await loadGitStatus();
      onRefresh?.();
      alert('Changes pushed successfully!');
    } catch (error) {
      console.error('Failed to push:', error);
      alert('Failed to push changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    if (!project.gitConfig.remoteUrl) {
      alert('No remote repository configured');
      return;
    }

    try {
      setIsLoading(true);
      await githubSync.pullFromGitHub(projectId);
      await loadGitStatus();
      onRefresh?.();
      alert('Changes pulled successfully!');
    } catch (error) {
      console.error('Failed to pull:', error);
      alert('Failed to pull changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePR = async () => {
    if (!prTitle.trim()) {
      alert('Please enter a PR title');
      return;
    }

    try {
      setIsLoading(true);
      const pr = await githubSync.createPullRequest(
        projectId,
        prTitle.trim(),
        prBody.trim(),
        currentBranch,
        'main'
      );
      
      setPrTitle('');
      setPrBody('');
      setShowPRModal(false);
      await loadGitStatus();
      
      alert('Pull request created successfully!');
    } catch (error) {
      console.error('Failed to create PR:', error);
      alert('Failed to create pull request');
    } finally {
      setIsLoading(false);
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ahead':
        return <Upload className="h-5 w-5 text-blue-500" />;
      case 'behind':
        return <Download className="h-5 w-5 text-orange-500" />;
      case 'diverged':
        return <GitMerge className="h-5 w-5 text-red-500" />;
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'Up to date';
      case 'ahead':
        return 'Local changes ahead';
      case 'behind':
        return 'Behind remote';
      case 'diverged':
        return 'Diverged';
      case 'disconnected':
        return 'Not connected';
    }
  };

  if (!project.gitConfig.isConnected) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">GitHub Not Connected</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect this project to a GitHub repository to enable sync features
        </p>
        <Button onClick={() => alert('GitHub connection flow would start here')}>
          Connect to GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getSyncStatusIcon()}
            <div>
              <p className="font-semibold">{getSyncStatusText()}</p>
              <p className="text-sm text-muted-foreground">
                Branch: {currentBranch}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadGitStatus}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommitModal(true)}
            disabled={modifiedFiles.length === 0 || isLoading}
          >
            <GitCommit className="h-4 w-4 mr-2" />
            Commit
            {modifiedFiles.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {modifiedFiles.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={syncStatus === 'synced' || isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Push
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={syncStatus !== 'behind' && syncStatus !== 'diverged' || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Pull
          </Button>
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold text-red-500">Merge Conflicts Detected</p>
              <p className="text-sm text-red-200 mt-1">
                {conflicts.length} file(s) have conflicts that need to be resolved
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="changes" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="changes" className="flex-1">
            Changes {modifiedFiles.length > 0 && `(${modifiedFiles.length})`}
          </TabsTrigger>
          <TabsTrigger value="commits" className="flex-1">
            Commits
          </TabsTrigger>
          <TabsTrigger value="prs" className="flex-1">
            Pull Requests {pullRequests.length > 0 && `(${pullRequests.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-2 mt-4">
          {modifiedFiles.length > 0 ? (
            modifiedFiles.map((file, index) => (
              <div key={index} className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{file}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Modified
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No modified files</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commits" className="space-y-2 mt-4">
          {commits.length > 0 ? (
            commits.map((commit) => (
              <div key={commit.id} className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-start gap-3">
                  <GitCommit className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{commit.author}</span>
                      <span>•</span>
                      <span>{new Date(commit.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No commits yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prs" className="space-y-2 mt-4">
          <Button
            onClick={() => setShowPRModal(true)}
            className="w-full mb-3"
            disabled={modifiedFiles.length === 0}
          >
            <GitPullRequest className="h-4 w-4 mr-2" />
            Create Pull Request
          </Button>

          {pullRequests.length > 0 ? (
            pullRequests.map((pr) => (
              <div key={pr.number} className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-start gap-3">
                  <GitPullRequest className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">#{pr.number} {pr.title}</p>
                      <Badge
                        variant={pr.state === 'open' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {pr.state}
                      </Badge>
                    </div>
                    {pr.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{pr.body}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No pull requests</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Commit Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Commit Changes</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCommitModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Commit Message</label>
              <Textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={4}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>{modifiedFiles.length} file(s) will be committed</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCommitModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <GitCommit className="h-4 w-4 mr-2" />
                )}
                Commit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PR Modal */}
      {showPRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create Pull Request</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPRModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="PR title..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                placeholder="Describe your changes..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPRModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePR}
                disabled={!prTitle.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <GitPullRequest className="h-4 w-4 mr-2" />
                )}
                Create PR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
