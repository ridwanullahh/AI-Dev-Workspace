import CryptoJS from 'crypto-js'

// OAuth Configuration Types
export interface OAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  authorizationEndpoint: string
  tokenEndpoint: string
  userInfoEndpoint?: string
}

export interface OAuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: string
  scope: string
  tokenType: string
}

export interface OAuthAccount {
  id: string
  provider: string
  email: string
  name: string
  picture?: string
  tokens: OAuthToken
  isActive: boolean
  lastUsed: string
}

export interface OAuthState {
  state: string
  codeVerifier: string
  redirectUri: string
  provider: string
  timestamp: number
}

// Google OAuth Configuration
const GOOGLE_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  redirectUri: `${window.location.origin}/oauth/callback`,
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/generative.language' // Gemini API scope
  ],
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo'
}

// OAuth Service Class
export class OAuthService {
  private states: Map<string, OAuthState> = new Map()
  private accounts: Map<string, OAuthAccount> = new Map()

  constructor() {
    // Load stored states and accounts from localStorage
    this.loadFromStorage()
  }

  // Generate PKCE code verifier and challenge
  private generatePKCECodes(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = this.generateRandomString(128)
    const codeChallenge = this.base64UrlEncode(
      CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64)
    )
    return { codeVerifier, codeChallenge }
  }

  // Generate random string for state and PKCE
  private generateRandomString(length: number): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Base64 URL encoding
  private base64UrlEncode(str: string): string {
    return str
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // Create OAuth authorization URL
  createAuthorizationUrl(provider: string, config: OAuthConfig = GOOGLE_OAUTH_CONFIG): string {
    const { codeVerifier, codeChallenge } = this.generatePKCECodes()
    const state = this.generateRandomString(32)
    
    // Store state for later verification
    const oauthState: OAuthState = {
      state,
      codeVerifier,
      redirectUri: config.redirectUri,
      provider,
      timestamp: Date.now()
    }
    
    this.states.set(state, oauthState)
    this.saveToStorage()

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', // For refresh tokens
      prompt: 'consent' // Force consent screen for new accounts
    })

    return `${config.authorizationEndpoint}?${params.toString()}`
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(
    code: string,
    state: string,
    config: OAuthConfig = GOOGLE_OAUTH_CONFIG
  ): Promise<OAuthToken> {
    // Verify state
    const oauthState = this.states.get(state)
    if (!oauthState) {
      throw new Error('Invalid or expired OAuth state')
    }

    if (Date.now() - oauthState.timestamp > 10 * 60 * 1000) { // 10 minutes
      throw new Error('OAuth state expired')
    }

    try {
      const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          code,
          redirect_uri: oauthState.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: oauthState.codeVerifier
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Token exchange failed: ${error}`)
      }

      const tokenData = await response.json()
      
      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        scope: tokenData.scope,
        tokenType: tokenData.token_type
      }

      // Clean up state
      this.states.delete(state)
      this.saveToStorage()

      return token
    } catch (error) {
      console.error('Token exchange error:', error)
      throw error
    }
  }

  // Get user info from OAuth provider
  async getUserInfo(
    accessToken: string,
    config: OAuthConfig = GOOGLE_OAUTH_CONFIG
  ): Promise<{ email: string; name: string; picture?: string }> {
    if (!config.userInfoEndpoint) {
      throw new Error('User info endpoint not configured')
    }

    try {
      const response = await fetch(config.userInfoEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get user info')
      }

      const userInfo = await response.json()
      return {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      }
    } catch (error) {
      console.error('User info error:', error)
      throw error
    }
  }

  // Refresh access token
  async refreshToken(
    refreshToken: string,
    config: OAuthConfig = GOOGLE_OAUTH_CONFIG
  ): Promise<OAuthToken> {
    try {
      const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const tokenData = await response.json()
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        scope: tokenData.scope,
        tokenType: tokenData.token_type
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  // Add OAuth account
  async addOAuthAccount(
    provider: string,
    token: OAuthToken,
    userInfo: { email: string; name: string; picture?: string }
  ): Promise<OAuthAccount> {
    const accountId = `${provider}_${userInfo.email}_${Date.now()}`
    
    const account: OAuthAccount = {
      id: accountId,
      provider,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      tokens: token,
      isActive: true,
      lastUsed: new Date().toISOString()
    }

    this.accounts.set(accountId, account)
    this.saveToStorage()
    
    console.log(`✅ OAuth account added: ${userInfo.email}`)
    return account
  }

  // Get OAuth account
  getOAuthAccount(accountId: string): OAuthAccount | null {
    return this.accounts.get(accountId) || null
  }

  // Get all OAuth accounts for a provider
  getOAuthAccounts(provider: string): OAuthAccount[] {
    return Array.from(this.accounts.values()).filter(
      account => account.provider === provider
    )
  }

  // Get active OAuth accounts
  getActiveOAuthAccounts(provider?: string): OAuthAccount[] {
    return Array.from(this.accounts.values()).filter(
      account => account.isActive && (!provider || account.provider === provider)
    )
  }

  // Update OAuth account tokens
  async updateOAuthAccountTokens(
    accountId: string,
    tokens: OAuthToken
  ): Promise<void> {
    const account = this.accounts.get(accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    account.tokens = tokens
    account.lastUsed = new Date().toISOString()
    this.saveToStorage()
    
    console.log(`✅ OAuth account tokens updated: ${account.email}`)
  }

  // Remove OAuth account
  removeOAuthAccount(accountId: string): void {
    this.accounts.delete(accountId)
    this.saveToStorage()
    
    console.log(`✅ OAuth account removed: ${accountId}`)
  }

  // Toggle OAuth account active status
  toggleOAuthAccount(accountId: string, isActive: boolean): void {
    const account = this.accounts.get(accountId)
    if (account) {
      account.isActive = isActive
      this.saveToStorage()
    }
  }

  // Check if token needs refresh
  needsTokenRefresh(token: OAuthToken): boolean {
    const expiresAt = new Date(token.expiresAt).getTime()
    const now = Date.now()
    const refreshThreshold = 5 * 60 * 1000 // 5 minutes before expiration
    
    return now > (expiresAt - refreshThreshold)
  }

  // Auto-refresh tokens if needed
  async refreshTokensIfNeeded(): Promise<void> {
    const refreshPromises: Promise<void>[] = []

    for (const account of this.accounts.values()) {
      if (account.isActive && this.needsTokenRefresh(account.tokens)) {
        if (account.tokens.refreshToken) {
          refreshPromises.push(
            this.refreshAndAccountTokens(account)
          )
        } else {
          // No refresh token available, deactivate account
          account.isActive = false
          console.warn(`OAuth account deactivated (no refresh token): ${account.email}`)
        }
      }
    }

    await Promise.allSettled(refreshPromises)
    this.saveToStorage()
  }

  // Refresh tokens and update account
  private async refreshAndAccountTokens(account: OAuthAccount): Promise<void> {
    try {
      const newTokens = await this.refreshToken(account.tokens.refreshToken!)
      await this.updateOAuthAccountTokens(account.id, newTokens)
      console.log(`✅ Tokens refreshed for: ${account.email}`)
    } catch (error) {
      console.error(`Failed to refresh tokens for ${account.email}:`, error)
      account.isActive = false
    }
  }

  // Handle OAuth callback
  async handleOAuthCallback(
    code: string,
    state: string,
    config: OAuthConfig = GOOGLE_OAUTH_CONFIG
  ): Promise<OAuthAccount> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, state, config)
    
    // Get user info
    const userInfo = await this.getUserInfo(tokens.accessToken, config)
    
    // Add or update account
    const existingAccount = Array.from(this.accounts.values()).find(
      account => account.provider === 'google' && account.email === userInfo.email
    )

    if (existingAccount) {
      await this.updateOAuthAccountTokens(existingAccount.id, tokens)
      return existingAccount
    } else {
      return await this.addOAuthAccount('google', tokens, userInfo)
    }
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        states: Array.from(this.states.entries()),
        accounts: Array.from(this.accounts.entries())
      }
      localStorage.setItem('oauth_data', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save OAuth data to storage:', error)
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('oauth_data')
      if (stored) {
        const data = JSON.parse(stored)
        this.states = new Map(data.states || [])
        this.accounts = new Map(data.accounts || [])
        
        // Clean up expired states
        const now = Date.now()
        for (const [stateKey, stateValue] of this.states) {
          if (now - stateValue.timestamp > 10 * 60 * 1000) {
            this.states.delete(stateKey)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load OAuth data from storage:', error)
    }
  }

  // Clear all OAuth data
  clearAllData(): void {
    this.states.clear()
    this.accounts.clear()
    localStorage.removeItem('oauth_data')
    console.log('✅ All OAuth data cleared')
  }

  // Get OAuth statistics
  getStats(): {
    totalAccounts: number
    activeAccounts: number
    accountsByProvider: Record<string, number>
  } {
    const accounts = Array.from(this.accounts.values())
    const activeAccounts = accounts.filter(account => account.isActive)
    
    const accountsByProvider = accounts.reduce((acc, account) => {
      acc[account.provider] = (acc[account.provider] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      accountsByProvider
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService()