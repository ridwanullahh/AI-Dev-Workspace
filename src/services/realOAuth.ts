import { db, encryptionService } from '../database/schema';
import type { Account } from '../database/schema';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class RealOAuthService {
  private readonly CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  private readonly CLIENT_SECRET = (import.meta as any).env?.VITE_GOOGLE_CLIENT_SECRET || '';
  private readonly REDIRECT_URI = `${window.location.origin}/oauth/callback`;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/generative.language',
    'openid',
    'email',
    'profile'
  ];

  // Real Google OAuth URL generation
  createAuthorizationUrl(providerId: string, state?: string): string {
    if (providerId !== 'gemini' && providerId !== 'google') {
      throw new Error(`OAuth not supported for provider: ${providerId}`);
    }

    const authState = state || this.generateState();
    sessionStorage.setItem('oauth_state', authState);
    sessionStorage.setItem('oauth_provider', providerId);

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPES.join(' '),
      response_type: 'code',
      state: authState,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Handle OAuth callback with real token exchange
  async handleOAuthCallback(code: string, state: string): Promise<Account> {
    try {
      // Validate state
      const storedState = sessionStorage.getItem('oauth_state');
      const storedProvider = sessionStorage.getItem('oauth_provider');
      
      if (storedState !== state) {
        throw new Error('Invalid OAuth state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      // Get user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      // Encrypt tokens
      if (!encryptionService.isUnlocked()) {
        throw new Error('Encryption service not initialized');
      }

      const tokens = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type,
        scope: tokenResponse.scope
      };

      const encryptedTokens = encryptionService.encrypt(JSON.stringify(tokens));

      // Create account record
      const account: Account = {
        id: `${storedProvider}_${userInfo.id}`,
        providerId: storedProvider || 'gemini',
        email: userInfo.email,
        name: userInfo.name,
        encryptedTokens,
        priority: 1,
        weight: 1,
        isActive: true,
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          tokensPerMinute: 150000
        },
        usage: {
          requestsToday: 0,
          tokensToday: 0,
          lastReset: new Date()
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          errorCount: 0,
          circuitBreakerOpen: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await db.accounts.put(account);

      // Clean up session storage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_provider');

      return account;
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw new Error(`Failed to complete OAuth authentication: ${error.message}`);
    }
  }

  // Real token exchange with Google
  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const body = new URLSearchParams({
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.REDIRECT_URI
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    return await response.json();
  }

  // Get user info from Google
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
    
    const response = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  // Refresh token functionality
  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    try {
      const tokens = JSON.parse(encryptionService.decrypt(account.encryptedTokens));
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      // Check if token needs refresh (expires within 5 minutes)
      const expiresAt = new Date(account.updatedAt.getTime() + (tokens.expires_in * 1000));
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiresAt > fiveMinutesFromNow) {
        return account; // Token is still valid
      }

      // Refresh the token
      const newTokens = await this.refreshAccessToken(tokens.refresh_token);
      
      // Update account with new tokens
      const updatedTokens = {
        ...tokens,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        expires_in: newTokens.expires_in
      };

      const updatedAccount: Account = {
        ...account,
        encryptedTokens: encryptionService.encrypt(JSON.stringify(updatedTokens)),
        updatedAt: new Date()
      };

      await db.accounts.put(updatedAccount);
      return updatedAccount;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // Mark account as failed
      const failedAccount = {
        ...account,
        health: {
          ...account.health,
          status: 'failed' as const,
          lastCheck: new Date(),
          errorCount: account.health.errorCount + 1
        },
        updatedAt: new Date()
      };

      await db.accounts.put(failedAccount);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  // Refresh access token with Google
  private async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const body = new URLSearchParams({
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token refresh failed');
    }

    return await response.json();
  }

  // Get all accounts
  async getAccounts(): Promise<Account[]> {
    return await db.accounts.orderBy('priority').toArray();
  }

  // Get active accounts for a provider
  async getActiveAccounts(providerId: string): Promise<Account[]> {
    return await db.accounts
      .where('providerId').equals(providerId)
      .and(account => account.isActive && !account.health.circuitBreakerOpen)
      .sortBy('priority');
  }

  // Update account priority/weight
  async updateAccountPriority(accountId: string, priority: number, weight: number): Promise<void> {
    await db.accounts.update(accountId, {
      priority,
      weight,
      updatedAt: new Date()
    });
  }

  // Deactivate account
  async deactivateAccount(accountId: string): Promise<void> {
    await db.accounts.update(accountId, {
      isActive: false,
      updatedAt: new Date()
    });
  }

  // Remove account
  async removeAccount(accountId: string): Promise<void> {
    await db.accounts.delete(accountId);
  }

  // Health check for account
  async healthCheckAccount(account: Account): Promise<boolean> {
    try {
      const tokens = JSON.parse(encryptionService.decrypt(account.encryptedTokens));
      
      // Simple health check - try to get user info
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });

      const isHealthy = response.ok;
      
      // Update health status
      await db.accounts.update(account.id, {
        health: {
          status: isHealthy ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          errorCount: isHealthy ? 0 : account.health.errorCount + 1,
          circuitBreakerOpen: !isHealthy && account.health.errorCount >= 3
        },
        updatedAt: new Date()
      });

      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      
      await db.accounts.update(account.id, {
        health: {
          status: 'failed',
          lastCheck: new Date(),
          errorCount: account.health.errorCount + 1,
          circuitBreakerOpen: account.health.errorCount >= 2
        },
        updatedAt: new Date()
      });

      return false;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export const realOAuthService = new RealOAuthService();