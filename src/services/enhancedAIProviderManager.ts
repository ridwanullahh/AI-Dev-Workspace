import { oauthService } from './oauth'
import { storageService } from './storage'
import type { 
  AIProvider, 
  AIAccount, 
  RateLimit, 
  Usage, 
  ProviderConfig,
  AIRequest,
  AIResponse 
} from '../types'

interface QueuedRequest {
  id: string
  request: AIRequest
  priority: number
  timeout: number
  resolve: (response: AIResponse) => void
  reject: (error: Error) => void
  timestamp: number
  retryCount: number
}

interface ProviderHealth {
  providerId: string
  accountId: string
  isHealthy: boolean
  lastCheck: string
  responseTime: number
  errorRate: number
}

interface LoadBalancingConfig {
  strategy: 'round-robin' | 'weighted' | 'least-latency' | 'adaptive'
  weights: Record<string, number>
  healthCheckInterval: number
  maxRetries: number
  timeout: number
}

export class EnhancedAIProviderManager {
  private providers: Map<string, AIProvider> = new Map()
  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  private healthStatus: Map<string, ProviderHealth> = new Map()
  private loadBalancingConfig: LoadBalancingConfig = {
    strategy: 'adaptive',
    weights: {},
    healthCheckInterval: 30000, // 30 seconds
    maxRetries: 3,
    timeout: 30000 // 30 seconds
  }

  constructor() {
    this.initializeDefaultProviders()
    this.startHealthChecks()
    this.startQueueProcessor()
    this.startTokenRefresh()
  }

  // Initialize default providers
  private initializeDefaultProviders(): void {
    const defaultProviders: AIProvider[] = [
      {
        id: 'gemini',
        name: 'Google Gemini',
        type: 'google',
        status: 'disconnected',
        accounts: [],
        config: {
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 4096,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta',
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      },
      {
        id: 'openai',
        name: 'OpenAI GPT',
        type: 'openai',
        status: 'disconnected',
        accounts: [],
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 4096,
          baseURL: 'https://api.openai.com/v1',
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      },
      {
        id: 'claude',
        name: 'Anthropic Claude',
        type: 'anthropic',
        status: 'disconnected',
        accounts: [],
        config: {
          model: 'claude-3-haiku-20240307',
          temperature: 0.7,
          maxTokens: 4096,
          baseURL: 'https://api.anthropic.com',
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      },
      {
        id: 'cohere',
        name: 'Cohere',
        type: 'cohere',
        status: 'disconnected',
        accounts: [],
        config: {
          model: 'command',
          temperature: 0.7,
          maxTokens: 4096,
          baseURL: 'https://api.cohere.ai/v1',
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      }
    ]

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider)
    })
  }

  // Add OAuth account to provider
  async addOAuthAccount(providerId: string, oauthAccountId: string): Promise<void> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    const oauthAccount = oauthService.getOAuthAccount(oauthAccountId)
    if (!oauthAccount) {
      throw new Error('OAuth account not found')
    }

    // Convert OAuth account to AI account
    const aiAccount: AIAccount = {
      id: oauthAccountId,
      providerId,
      name: oauthAccount.name,
      oauthToken: oauthAccount.tokens.accessToken,
      rateLimit: this.getDefaultRateLimit(providerId),
      usage: {
        requestsToday: 0,
        tokensToday: 0,
        costToday: 0,
        lastUsed: new Date().toISOString(),
        totalRequests: 0,
        totalTokens: 0
      },
      isActive: oauthAccount.isActive
    }

    provider.accounts.push(aiAccount)
    provider.status = 'connected'
    
    await this.saveProvider(provider)
    console.log(`✅ OAuth account added to ${providerId}: ${oauthAccount.email}`)
  }

  // Add API key account
  async addAPIKeyAccount(
    providerId: string,
    name: string,
    apiKey: string
  ): Promise<void> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    const accountId = `${providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const account: AIAccount = {
      id: accountId,
      providerId,
      name,
      apiKey,
      rateLimit: this.getDefaultRateLimit(providerId),
      usage: {
        requestsToday: 0,
        tokensToday: 0,
        costToday: 0,
        lastUsed: new Date().toISOString(),
        totalRequests: 0,
        totalTokens: 0
      },
      isActive: true
    }

    provider.accounts.push(account)
    provider.status = 'connected'
    
    await this.saveProvider(provider)
    console.log(`✅ API key account added to ${providerId}: ${name}`)
  }

  // Get default rate limits for provider
  private getDefaultRateLimit(providerId: string): RateLimit {
    const limits = {
      openai: {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 10000,
        tokensPerMinute: 150000
      },
      anthropic: {
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        requestsPerDay: 5000,
        tokensPerMinute: 100000
      },
      google: {
        requestsPerMinute: 60,
        requestsPerHour: 1500,
        requestsPerDay: 15000,
        tokensPerMinute: 300000
      },
      cohere: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        tokensPerMinute: 100000
      }
    }

    const providerLimits = limits[providerId as keyof typeof limits] || limits.openai
    
    return {
      ...providerLimits,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000).toISOString()
    }
  }

  // Send message with intelligent routing
  async sendMessage(request: AIRequest, options: {
    preferredProvider?: string
    priority?: number
    timeout?: number
  } = {}): Promise<AIResponse> {
    const {
      preferredProvider,
      priority = 5,
      timeout = this.loadBalancingConfig.timeout
    } = options

    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const queuedRequest: QueuedRequest = {
        id: requestId,
        request: { ...request, preferredProvider },
        priority,
        timeout,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0
      }

      this.requestQueue.push(queuedRequest)
      this.sortQueue()
      
      if (!this.isProcessingQueue) {
        this.processQueue()
      }
    })
  }

  // Sort queue by priority
  private sortQueue(): void {
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }
      return a.timestamp - b.timestamp // Earlier requests first
    })
  }

  // Process request queue
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return
    
    this.isProcessingQueue = true

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()!
        
        try {
          const response = await this.executeRequest(request)
          request.resolve(response)
        } catch (error) {
          if (request.retryCount < this.loadBalancingConfig.maxRetries) {
            request.retryCount++
            this.requestQueue.unshift(request) // Retry with same priority
            await new Promise(resolve => setTimeout(resolve, 1000 * request.retryCount))
          } else {
            request.reject(error instanceof Error ? error : new Error('Request failed after retries'))
          }
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  // Execute a single request
  private async executeRequest(queuedRequest: QueuedRequest): Promise<AIResponse> {
    const { request, timeout } = queuedRequest
    
    // Select best account based on load balancing strategy
    const account = await this.selectBestAccount(request.preferredProvider)
    if (!account) {
      throw new Error('No available AI accounts')
    }

    const provider = this.providers.get(account.providerId)!
    
    // Check rate limits
    if (!this.canMakeRequest(account, this.estimateTokens(request))) {
      throw new Error('Rate limit exceeded for selected account')
    }

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    })

    try {
      const response = await Promise.race([
        this.makeAPICall(provider, account, request),
        timeoutPromise
      ])
      
      await this.updateUsage(account, response.usage)
      return response
    } catch (error) {
      await this.handleAPIError(account, error)
      throw error
    }
  }

  // Select best account using load balancing
  private async selectBestAccount(preferredProvider?: string): Promise<AIAccount | null> {
    const availableAccounts: Array<{ account: AIAccount; score: number }> = []

    for (const provider of this.providers.values()) {
      if (preferredProvider && provider.id !== preferredProvider) continue
      if (provider.status !== 'connected') continue

      for (const account of provider.accounts) {
        if (!account.isActive) continue
        
        const health = this.healthStatus.get(`${provider.id}_${account.id}`)
        if (health && !health.isHealthy) continue
        
        if (this.canMakeRequest(account, 1000)) { // Check with estimated tokens
          const score = await this.calculateAccountScore(account, provider)
          availableAccounts.push({ account, score })
        }
      }
    }

    if (availableAccounts.length === 0) return null

    // Select based on strategy
    switch (this.loadBalancingConfig.strategy) {
      case 'weighted':
        return this.selectWeightedAccount(availableAccounts)
      case 'least-latency':
        return this.selectLeastLatencyAccount(availableAccounts)
      case 'round-robin':
        return this.selectRoundRobinAccount(availableAccounts)
      case 'adaptive':
      default:
        return this.selectAdaptiveAccount(availableAccounts)
    }
  }

  // Calculate account score for load balancing
  private async calculateAccountScore(account: AIAccount, provider: AIProvider): Promise<number> {
    const health = this.healthStatus.get(`${provider.id}_${account.id}`)
    
    // Base score from rate limit capacity
    const requestRatio = account.rateLimit.currentRequests / account.rateLimit.requestsPerMinute
    const tokenRatio = account.rateLimit.currentTokens / account.rateLimit.tokensPerMinute
    const capacityScore = 1 - Math.max(requestRatio, tokenRatio)

    // Health score
    const healthScore = health ? (health.isHealthy ? 1 : 0) : 0.5

    // Latency score (inverse of response time)
    const latencyScore = health ? Math.max(0, 1 - (health.responseTime / 10000)) : 0.5 // Normalize to 10s max

    // Error rate score (inverse of error rate)
    const errorScore = health ? Math.max(0, 1 - health.errorRate) : 0.5

    // Weighted combination
    const weights = this.loadBalancingConfig.weights
    const score = 
      (weights.capacity || 0.4) * capacityScore +
      (weights.health || 0.3) * healthScore +
      (weights.latency || 0.2) * latencyScore +
      (weights.error || 0.1) * errorScore

    return score
  }

  // Selection strategies
  private selectWeightedAccount(accounts: Array<{ account: AIAccount; score: number }>): AIAccount {
    // Sort by score and select highest
    accounts.sort((a, b) => b.score - a.score)
    return accounts[0].account
  }

  private selectLeastLatencyAccount(accounts: Array<{ account: AIAccount; score: number }>): AIAccount {
    // For now, same as weighted (latency is factored into score)
    return this.selectWeightedAccount(accounts)
  }

  private selectRoundRobinAccount(accounts: Array<{ account: AIAccount; score: number }>): AIAccount {
    // Simple round robin - in real implementation, would track last used
    return accounts[Math.floor(Math.random() * accounts.length)].account
  }

  private selectAdaptiveAccount(accounts: Array<{ account: AIAccount; score: number }>): AIAccount {
    // Adaptive selection based on current conditions
    return this.selectWeightedAccount(accounts)
  }

  // Check if request can be made
  private canMakeRequest(account: AIAccount, estimatedTokens: number): boolean {
    const now = Date.now()
    const resetTime = new Date(account.rateLimit.resetTime).getTime()

    // Reset rate limits if time has passed
    if (now >= resetTime) {
      this.resetRateLimit(account)
    }

    return (
      account.rateLimit.currentRequests < account.rateLimit.requestsPerMinute &&
      account.rateLimit.currentTokens + estimatedTokens < account.rateLimit.tokensPerMinute
    )
  }

  // Reset rate limit counters
  private resetRateLimit(account: AIAccount): void {
    account.rateLimit.currentRequests = 0
    account.rateLimit.currentTokens = 0
    account.rateLimit.resetTime = new Date(Date.now() + 60000).toISOString()
  }

  // Estimate tokens from request
  private estimateTokens(request: AIRequest): number {
    const text = JSON.stringify(request)
    return Math.ceil(text.length / 4) // Rough estimation
  }

  // Make API call to provider
  private async makeAPICall(
    provider: AIProvider,
    account: AIAccount,
    request: AIRequest
  ): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      let response: AIResponse

      switch (provider.type) {
        case 'openai':
          response = await this.callOpenAI(provider, account, request)
          break
        case 'anthropic':
          response = await this.callAnthropic(provider, account, request)
          break
        case 'google':
          response = await this.callGemini(provider, account, request)
          break
        case 'cohere':
          response = await this.callCohere(provider, account, request)
          break
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }

      // Update health status
      const responseTime = Date.now() - startTime
      this.updateHealthStatus(provider.id, account.id, {
        isHealthy: true,
        responseTime,
        errorRate: 0
      })

      return response
    } catch (error) {
      // Update health status with error
      const responseTime = Date.now() - startTime
      this.updateHealthStatus(provider.id, account.id, {
        isHealthy: false,
        responseTime,
        errorRate: 1
      })
      throw error
    }
  }

  // Provider-specific API call methods
  private async callOpenAI(
    provider: AIProvider,
    account: AIAccount,
    request: AIRequest
  ): Promise<AIResponse> {
    const response = await fetch(`${provider.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || provider.config.model,
        messages: request.messages,
        temperature: request.temperature || provider.config.temperature,
        max_tokens: request.maxTokens || provider.config.maxTokens,
        top_p: provider.config.topP,
        frequency_penalty: provider.config.frequencyPenalty,
        presence_penalty: provider.config.presencePenalty
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      cost: this.calculateCost('openai', data.usage.total_tokens),
      provider: 'openai'
    }
  }

  private async callAnthropic(
    provider: AIProvider,
    account: AIAccount,
    request: AIRequest
  ): Promise<AIResponse> {
    const messages = request.messages.filter(m => m.role !== 'system')
    const systemMessage = request.messages.find(m => m.role === 'system')?.content

    const response = await fetch(`${provider.config.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': account.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || provider.config.model,
        max_tokens: request.maxTokens || provider.config.maxTokens,
        temperature: request.temperature || provider.config.temperature,
        system: systemMessage,
        messages
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      cost: this.calculateCost('anthropic', data.usage.input_tokens + data.usage.output_tokens),
      provider: 'anthropic'
    }
  }

  private async callGemini(
    provider: AIProvider,
    account: AIAccount,
    request: AIRequest
  ): Promise<AIResponse> {
    const contents = request.messages.map(msg => ({
      parts: [{ text: msg.content }],
      role: msg.role === 'assistant' ? 'model' : 'user'
    }))

    const response = await fetch(
      `${provider.config.baseURL}/models/${request.model || provider.config.model}:generateContent?key=${account.oauthToken || account.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature || provider.config.temperature,
            maxOutputTokens: request.maxTokens || provider.config.maxTokens,
            topP: provider.config.topP
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
    const totalTokens = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0)
    
    return {
      content,
      model: request.model || provider.config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens
      },
      cost: this.calculateCost('google', totalTokens),
      provider: 'google'
    }
  }

  private async callCohere(
    provider: AIProvider,
    account: AIAccount,
    request: AIRequest
  ): Promise<AIResponse> {
    const response = await fetch(`${provider.config.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || provider.config.model,
        message: request.messages[request.messages.length - 1]?.content || '',
        temperature: request.temperature || provider.config.temperature,
        max_tokens: request.maxTokens || provider.config.maxTokens,
        p: provider.config.topP
      })
    })

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.text,
      model: request.model || provider.config.model,
      usage: {
        promptTokens: data.token_count?.prompt_tokens || 0,
        completionTokens: data.token_count?.response_tokens || 0,
        totalTokens: data.token_count?.total_tokens || 0
      },
      cost: this.calculateCost('cohere', data.token_count?.total_tokens || 0),
      provider: 'cohere'
    }
  }

  // Calculate API cost
  private calculateCost(providerType: string, tokens: number): number {
    const costs = {
      openai: 0.0015 / 1000, // $0.0015 per 1K tokens (GPT-3.5-turbo)
      anthropic: 0.00025 / 1000, // $0.00025 per 1K tokens (Claude Haiku)
      google: 0, // Free tier
      cohere: 0.001 / 1000 // $0.001 per 1K tokens
    }
    
    return (costs[providerType as keyof typeof costs] || 0) * tokens
  }

  // Update usage statistics
  private async updateUsage(account: AIAccount, usage: { totalTokens: number }): Promise<void> {
    account.usage.requestsToday++
    account.usage.tokensToday += usage.totalTokens
    account.usage.totalRequests++
    account.usage.totalTokens += usage.totalTokens
    account.usage.lastUsed = new Date().toISOString()
    account.usage.costToday += this.calculateCost(
      this.providers.get(account.providerId)!.type,
      usage.totalTokens
    )

    // Update rate limits
    account.rateLimit.currentRequests++
    account.rateLimit.currentTokens += usage.totalTokens

    // Save provider
    const provider = this.providers.get(account.providerId)!
    await this.saveProvider(provider)
  }

  // Handle API errors
  private async handleAPIError(account: AIAccount, error: any): Promise<void> {
    console.error(`API Error for account ${account.id}:`, error)
    
    // Handle rate limiting
    if (error.status === 429) {
      account.isActive = false
      const provider = this.providers.get(account.providerId)!
      await this.saveProvider(provider)
      
      // Re-enable after cooldown
      setTimeout(async () => {
        account.isActive = true
        await this.saveProvider(provider)
      }, 60000) // 1 minute cooldown
    }
  }

  // Update health status
  private updateHealthStatus(
    providerId: string,
    accountId: string,
    health: Partial<ProviderHealth>
  ): void {
    const key = `${providerId}_${accountId}`
    const current = this.healthStatus.get(key) || {
      providerId,
      accountId,
      isHealthy: true,
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0
    }

    const updated: ProviderHealth = {
      ...current,
      ...health,
      lastCheck: new Date().toISOString()
    }

    this.healthStatus.set(key, updated)
  }

  // Start health checks
  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks()
    }, this.loadBalancingConfig.healthCheckInterval)
  }

  // Perform health checks
  private async performHealthChecks(): Promise<void> {
    const checkPromises: Promise<void>[] = []

    for (const provider of this.providers.values()) {
      for (const account of provider.accounts) {
        if (!account.isActive) continue

        checkPromises.push(
          this.checkAccountHealth(provider, account)
            .catch(error => {
              console.error(`Health check failed for ${account.id}:`, error)
            })
        )
      }
    }

    await Promise.allSettled(checkPromises)
  }

  // Check individual account health
  private async checkAccountHealth(provider: AIProvider, account: AIAccount): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Simple health check - make a minimal request
      await this.makeAPICall(provider, account, {
        messages: [{ role: 'user', content: 'Hello' }]
      })

      const responseTime = Date.now() - startTime
      this.updateHealthStatus(provider.id, account.id, {
        isHealthy: true,
        responseTime,
        errorRate: 0
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateHealthStatus(provider.id, account.id, {
        isHealthy: false,
        responseTime,
        errorRate: 1
      })
    }
  }

  // Start queue processor
  private startQueueProcessor(): void {
    // Queue processing is event-driven, but we can add periodic cleanup
    setInterval(() => {
      this.cleanupQueue()
    }, 60000) // Clean up every minute
  }

  // Clean up old requests in queue
  private cleanupQueue(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    this.requestQueue = this.requestQueue.filter(request => {
      return now - request.timestamp < maxAge
    })
  }

  // Start token refresh
  private startTokenRefresh(): void {
    setInterval(() => {
      oauthService.refreshTokensIfNeeded()
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  // Save provider to storage
  private async saveProvider(provider: AIProvider): Promise<void> {
    try {
      await storageService.saveAIProvider(provider)
    } catch (error) {
      console.error('Failed to save provider:', error)
    }
  }

  // Get all providers
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  // Get provider by ID
  getProvider(id: string): AIProvider | null {
    return this.providers.get(id) || null
  }

  // Get statistics
  getStats(): {
    totalProviders: number
    connectedProviders: number
    totalAccounts: number
    activeAccounts: number
    queueSize: number
    healthStatus: Record<string, ProviderHealth>
  } {
    const providers = Array.from(this.providers.values())
    const connectedProviders = providers.filter(p => p.status === 'connected').length
    
    let totalAccounts = 0
    let activeAccounts = 0
    
    providers.forEach(provider => {
      totalAccounts += provider.accounts.length
      activeAccounts += provider.accounts.filter(a => a.isActive).length
    })

    const healthStatus = Object.fromEntries(this.healthStatus)

    return {
      totalProviders: providers.length,
      connectedProviders,
      totalAccounts,
      activeAccounts,
      queueSize: this.requestQueue.length,
      healthStatus
    }
  }
}

// Export singleton instance
export const enhancedAIProviderManager = new EnhancedAIProviderManager()