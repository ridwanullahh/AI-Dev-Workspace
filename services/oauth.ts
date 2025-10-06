interface OAuthAccount {
  id: string;
  email?: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

class OAuthService {
  private readonly CLIENT_ID = 'your-google-client-id'; // This should be configured
  private readonly REDIRECT_URI = `${window.location.origin}/oauth/callback`;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/generative.language',
    'openid',
    'email',
    'profile'
  ];

  createAuthorizationUrl(providerId: string): string {
    if (providerId !== 'gemini') {
      throw new Error(`OAuth not supported for provider: ${providerId}`);
    }

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPES.join(' '),
      response_type: 'code',
      state: this.generateState(),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<OAuthAccount> {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      // Get user info
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      return {
        id: userInfo.sub || userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.email,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
      };
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw new Error('Failed to complete OAuth authentication');
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private async exchangeCodeForTokens(code: string): Promise<any> {
    // This would typically make a POST request to Google's token endpoint
    // For now, this is a placeholder implementation
    
    // In a real implementation, you would:
    // 1. Make a POST request to https://oauth2.googleapis.com/token
    // 2. Include client_id, client_secret, code, grant_type, and redirect_uri
    // 3. Parse the response to get access_token, refresh_token, expires_in
    
    // Placeholder response
    return {
      access_token: 'placeholder_access_token',
      refresh_token: 'placeholder_refresh_token',
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }

  private async getUserInfo(accessToken: string): Promise<any> {
    // This would typically make a GET request to Google's userinfo endpoint
    // For now, this is a placeholder implementation
    
    // In a real implementation, you would:
    // 1. Make a GET request to https://www.googleapis.com/oauth2/v2/userinfo
    // 2. Include the access token in the Authorization header
    // 3. Parse the response to get user info
    
    // Placeholder response
    return {
      sub: 'user123',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://via.placeholder.com/150'
    };
  }

  async refreshTokenIfNeeded(account: OAuthAccount): Promise<OAuthAccount> {
    if (!account.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (account.expiresAt && new Date() < account.expiresAt) {
      return account; // Token is still valid
    }

    try {
      // Refresh the token
      const newTokens = await this.refreshAccessToken(account.refreshToken);
      
      return {
        ...account,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || account.refreshToken,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000)
      };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<any> {
    // This would typically make a POST request to Google's token endpoint with refresh_token
    // For now, this is a placeholder implementation
    
    return {
      access_token: 'new_placeholder_access_token',
      refresh_token: refreshToken, // Usually same refresh token
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }
}

export const oauthService = new OAuthService();