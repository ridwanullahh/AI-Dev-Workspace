import { db, encryptionService } from '../database/schema';

interface GitHubDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface GitHubAccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export class GitHubAuthService {
  private readonly CLIENT_ID = (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || 'Ov23liFZOuwczRGBqhSo';
  private readonly SCOPES = ['repo', 'user', 'workflow', 'admin:org'];
  
  async initiateDeviceFlow(): Promise<GitHubDeviceCodeResponse> {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES.join(' ')
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate GitHub device flow');
    }

    return await response.json();
  }

  async pollForAccessToken(deviceCode: string, interval: number): Promise<string> {
    const pollInterval = interval * 1000;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

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

      const data: GitHubAccessTokenResponse = await response.json();

      if (data.access_token) {
        await this.storeAccessToken(data.access_token);
        return data.access_token;
      }

      if (data.error === 'authorization_pending') {
        continue;
      }

      if (data.error === 'slow_down') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }
    }

    throw new Error('GitHub authentication timed out');
  }

  private async storeAccessToken(token: string): Promise<void> {
    if (!encryptionService.isUnlocked()) {
      throw new Error('Encryption service not initialized');
    }

    const encryptedToken = encryptionService.encrypt(token);
    
    await db.settings.put({
      id: 'github_access_token',
      category: 'git',
      key: 'access_token',
      value: encryptedToken,
      encrypted: true,
      updatedAt: new Date()
    });
  }

  async getStoredToken(): Promise<string | null> {
    const setting = await db.settings.get('github_access_token');
    if (!setting) return null;

    if (!encryptionService.isUnlocked()) {
      throw new Error('Encryption service not initialized');
    }

    return encryptionService.decrypt(setting.value);
  }

  async getAuthenticatedUser(): Promise<GitHubUser | null> {
    const token = await this.getStoredToken();
    if (!token) return null;

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) return null;

    return await response.json();
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getAuthenticatedUser();
    return user !== null;
  }

  async revokeAccess(): Promise<void> {
    await db.settings.delete('github_access_token');
  }

  async verifyPermissions(): Promise<{
    hasRepoAccess: boolean;
    hasUserAccess: boolean;
    hasWorkflowAccess: boolean;
  }> {
    const token = await this.getStoredToken();
    if (!token) {
      return {
        hasRepoAccess: false,
        hasUserAccess: false,
        hasWorkflowAccess: false
      };
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return {
        hasRepoAccess: false,
        hasUserAccess: false,
        hasWorkflowAccess: false
      };
    }

    const scopes = response.headers.get('x-oauth-scopes')?.split(',').map(s => s.trim()) || [];
    
    return {
      hasRepoAccess: scopes.includes('repo'),
      hasUserAccess: scopes.includes('user'),
      hasWorkflowAccess: scopes.includes('workflow')
    };
  }
 async getRepositories(page = 1, perPage = 30): Promise<{ repos: any[], hasNextPage: boolean }> {
   const token = await this.getStoredToken();
   if (!token) {
     throw new Error('Not authenticated with GitHub');
   }

   const response = await fetch(`https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=updated`, {
     headers: {
       'Authorization': `Bearer ${token}`,
       'Accept': 'application/vnd.github.v3+json'
     }
   });

   if (!response.ok) {
     throw new Error('Failed to fetch repositories');
   }

   const repos = await response.json();
   const linkHeader = response.headers.get('Link');
   const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;

   return { repos, hasNextPage };
 }
}

export const githubAuth = new GitHubAuthService();
