import { db } from '../database/schema';
import type { Project } from '../database/schema';
import { gitCore } from './gitCore';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

interface GitHubPR {
  number: number;
  title: string;
  body: string;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  state: 'open' | 'closed' | 'merged';
  html_url: string;
}

export class GitHubSyncService {
  private readonly CLIENT_ID = (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || '';
  private accessToken: string | null = null;

  // GitHub Device Flow OAuth
  async initiateDeviceFlow(): Promise<{ device_code: string; user_code: string; verification_uri: string; interval: number }> {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        scope: 'repo user'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate device flow');
    }

    return await response.json();
  }

  async pollForToken(deviceCode: string, interval: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: this.CLIENT_ID,
              device_code: deviceCode,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          });

          const data = await response.json();

          if (data.access_token) {
            clearInterval(pollInterval);
            this.accessToken = data.access_token;
            
            // Store token securely
            await this.storeGitHubToken(data.access_token);
            resolve(data.access_token);
          } else if (data.error === 'authorization_pending') {
            // Continue polling
          } else {
            clearInterval(pollInterval);
            reject(new Error(data.error_description || 'Authorization failed'));
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, interval * 1000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Authorization timeout'));
      }, 600000);
    });
  }

  private async storeGitHubToken(token: string): Promise<void> {
    await db.settings.put({
      id: 'github_token',
      category: 'git',
      key: 'access_token',
      value: token,
      encrypted: true,
      updatedAt: new Date()
    });
  }

  private async getStoredToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;

    const setting = await db.settings.get('github_token');
    if (setting) {
      this.accessToken = setting.value;
      return setting.value;
    }

    return null;
  }

  // Repository operations
  async getRepositories(): Promise<GitHubRepo[]> {
    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    return await response.json();
  }

  async createRepository(name: string, description: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create repository');
    }

    return await response.json();
  }

  // Sync operations
  async syncProjectToGitHub(projectId: string, repoName?: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    try {
      // Create repo if it doesn't exist
      let repo: GitHubRepo;
      if (!project.gitConfig.remoteUrl) {
        repo = await this.createRepository(
          repoName || project.name,
          project.description,
          true
        );

        // Update project with remote URL
        await db.projects.update(projectId, {
          gitConfig: {
            ...project.gitConfig,
            remoteUrl: repo.clone_url
          },
          updatedAt: new Date()
        });
      }

      // Push local changes to GitHub
      await this.pushToGitHub(projectId);

    } catch (error) {
      console.error('Failed to sync project to GitHub:', error);
      throw new Error(`GitHub sync failed: ${error.message}`);
    }
  }

  async pullFromGitHub(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) {
      throw new Error('Project not configured for GitHub sync');
    }

    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    try {
      await gitCore.pull(projectId);
      
      // Update last sync time
      await db.projects.update(projectId, {
        'gitConfig.lastSync': new Date(),
      });

    } catch (error) {
      console.error('Failed to pull from GitHub:', error);
      throw new Error(`GitHub pull failed: ${error.message}`);
    }
  }

  private async pushToGitHub(projectId: string): Promise<void> {
    await gitCore.push(projectId);
  }

  // Pull Request operations
  async createPullRequest(
    projectId: string, 
    title: string, 
    body: string, 
    head: string, 
    base: string = 'main'
  ): Promise<GitHubPR> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) {
      throw new Error('Project not configured for GitHub');
    }

    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    // Extract owner/repo from URL
    const repoMatch = project.gitConfig.remoteUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\.git/);
    if (!repoMatch) throw new Error('Invalid GitHub repository URL');

    const [, owner, repo] = repoMatch;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create pull request');
    }

    return await response.json();
  }

  async getPullRequests(projectId: string): Promise<GitHubPR[]> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) {
      throw new Error('Project not configured for GitHub');
    }

    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    // Extract owner/repo from URL
    const repoMatch = project.gitConfig.remoteUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\.git/);
    if (!repoMatch) throw new Error('Invalid GitHub repository URL');

    const [, owner, repo] = repoMatch;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pull requests');
    }

    return await response.json();
  }

  // Bidirectional sync
  async setupBidirectionalSync(projectId: string, interval: number = 60000): Promise<void> {
    const syncInterval = setInterval(async () => {
      try {
        await this.bidirectionalSync(projectId);
      } catch (error) {
        console.error('Bidirectional sync failed:', error);
      }
    }, interval);

    await db.settings.put({
      id: `sync_interval_${projectId}`,
      category: 'git',
      key: 'sync_interval',
      value: syncInterval,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  private async bidirectionalSync(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) return;

    // Fetch remote changes
    const hasRemoteChanges = await this.checkRemoteChanges(projectId);
    if (hasRemoteChanges) {
      await this.pullFromGitHub(projectId);
    }

    // Push local changes
    const hasLocalChanges = await this.checkLocalChanges(projectId);
    if (hasLocalChanges) {
      await this.pushToGitHub(projectId);
    }
  }

  private async checkRemoteChanges(projectId: string): Promise<boolean> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) return false;

    const token = await this.getStoredToken();
    if (!token) return false;

    const repoMatch = project.gitConfig.remoteUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\.git/);
    if (!repoMatch) return false;

    const [, owner, repo] = repoMatch;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${project.gitConfig.branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return false;

    const latestCommit = await response.json();
    const localCommit = await db.commits.where('projectId').equals(projectId).last();

    return !localCommit || latestCommit.sha !== localCommit.hash;
  }

  private async checkLocalChanges(projectId: string): Promise<boolean> {
    const files = await db.files.where('projectId').equals(projectId).and(f => f.isDirty).toArray();
    return files.length > 0;
  }

  // Conflict resolution
  async getConflicts(projectId: string): Promise<Array<{ 
    file: string; 
    conflicts: Array<{
      ours: string;
      theirs: string;
      base: string;
      startLine: number;
      endLine: number;
    }> 
  }>> {
    const files = await db.files.where('projectId').equals(projectId).toArray();
    const conflictFiles: Array<{ 
      file: string; 
      conflicts: Array<{
        ours: string;
        theirs: string;
        base: string;
        startLine: number;
        endLine: number;
      }> 
    }> = [];

    for (const file of files) {
      if (file.content.includes('<<<<<<<') && file.content.includes('>>>>>>>')) {
        const conflicts = this.parseConflictMarkers(file.content);
        if (conflicts.length > 0) {
          conflictFiles.push({
            file: file.path,
            conflicts
          });
        }
      }
    }

    return conflictFiles;
  }

  private parseConflictMarkers(content: string): Array<{
    ours: string;
    theirs: string;
    base: string;
    startLine: number;
    endLine: number;
  }> {
    const lines = content.split('\n');
    const conflicts = [];
    let currentConflict: any = null;
    let lineNum = 0;

    for (const line of lines) {
      lineNum++;
      
      if (line.startsWith('<<<<<<<')) {
        currentConflict = { 
          startLine: lineNum, 
          ours: '', 
          theirs: '', 
          base: '',
          stage: 'ours' 
        };
      } else if (line.startsWith('|||||||') && currentConflict) {
        currentConflict.stage = 'base';
      } else if (line.startsWith('=======') && currentConflict) {
        currentConflict.stage = 'theirs';
      } else if (line.startsWith('>>>>>>>') && currentConflict) {
        currentConflict.endLine = lineNum;
        const { stage, ...conflict } = currentConflict;
        conflicts.push(conflict);
        currentConflict = null;
      } else if (currentConflict) {
        if (currentConflict.stage === 'ours') {
          currentConflict.ours += line + '\n';
        } else if (currentConflict.stage === 'theirs') {
          currentConflict.theirs += line + '\n';
        } else if (currentConflict.stage === 'base') {
          currentConflict.base += line + '\n';
        }
      }
    }

    return conflicts;
  }

  async resolveConflict(
    projectId: string, 
    filePath: string, 
    resolution: 'ours' | 'theirs' | 'manual', 
    manualContent?: string
  ): Promise<void> {
    const file = await db.files.where({ projectId, path: filePath }).first();
    if (!file) throw new Error('File not found');

    const conflicts = this.parseConflictMarkers(file.content);
    if (conflicts.length === 0) return;

    let resolvedContent = file.content;

    if (resolution === 'manual' && manualContent) {
      resolvedContent = manualContent;
    } else {
      const lines = resolvedContent.split('\n');
      let newLines = [];
      let inConflict = false;
      let conflictType = '';

      for (const line of lines) {
        if (line.startsWith('<<<<<<<')) {
          inConflict = true;
          conflictType = resolution;
          continue;
        } else if (line.startsWith('>>>>>>>')) {
          inConflict = false;
          continue;
        } else if (line.startsWith('=======')) {
          conflictType = conflictType === 'ours' ? '' : 'theirs';
          continue;
        } else if (line.startsWith('|||||||')) {
          continue;
        }

        if (!inConflict || 
            (conflictType === 'ours' && resolution === 'ours') ||
            (conflictType === 'theirs' && resolution === 'theirs')) {
          newLines.push(line);
        }
      }

      resolvedContent = newLines.join('\n');
    }

    await db.files.update(file.id, {
      content: resolvedContent,
      isDirty: true,
      lastModified: new Date()
    });
  }

  // Webhook handling for real-time sync
  async setupWebhook(projectId: string, webhookUrl: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project || !project.gitConfig.remoteUrl) {
      throw new Error('Project not configured for GitHub');
    }

    const token = await this.getStoredToken();
    if (!token) throw new Error('GitHub token not found');

    // Extract owner/repo from URL
    const repoMatch = project.gitConfig.remoteUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\.git/);
    if (!repoMatch) throw new Error('Invalid GitHub repository URL');

    const [, owner, repo] = repoMatch;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: {
          url: webhookUrl,
          content_type: 'json'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to setup webhook');
    }
  }

  // Status checking
  async isTokenValid(): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) return false;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async revokeToken(): Promise<void> {
    this.accessToken = null;
    await db.settings.delete('github_token');
  }
}

export const githubSync = new GitHubSyncService();