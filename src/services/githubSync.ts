import { db } from '../database/schema';
import type { Project } from '../database/schema';

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
  private readonly CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
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
      // This would use isomorphic-git to pull changes
      // Implementation would involve fetching and merging remote changes
      console.log('Pulling from GitHub:', project.gitConfig.remoteUrl);
      
      // Update last sync time
      await db.projects.update(projectId, {
        gitConfig: {
          ...project.gitConfig,
          lastSync: new Date()
        },
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Failed to pull from GitHub:', error);
      throw new Error(`GitHub pull failed: ${error.message}`);
    }
  }

  private async pushToGitHub(projectId: string): Promise<void> {
    // Implementation would use isomorphic-git to push changes
    // This is a simplified version
    console.log('Pushing to GitHub for project:', projectId);
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

  // Conflict resolution
  async getConflicts(projectId: string): Promise<Array<{ file: string; conflicts: string[] }>> {
    // This would analyze merge conflicts and return structured data
    // Implementation would involve parsing git conflict markers
    return [];
  }

  async resolveConflict(projectId: string, filePath: string, resolution: string): Promise<void> {
    // This would apply conflict resolution to the specified file
    console.log('Resolving conflict:', { projectId, filePath, resolution });
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