import { AIProvider, AIAccount, ChatMessage, RateLimit, Usage } from './types';
import { storageService } from './storage';

interface AIRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

class AIProviderService {
  private providers: Map<string, AIProvider> = new Map();
  private activeAccount: AIAccount | null = null;
  private rateLimitTrackers: Map<string, RateLimit> = new Map();

  async initialize(): Promise<void> {
    await this.loadProviders();
    this.initializeDefaultProviders();
    this.startRateLimitReset();
  }

  private async loadProviders(): Promise<void> {
    try {
      const providers = await storageService.getProviders();
      for (const provider of providers) {
        this.providers.set(provider.id, provider);
        
        // Initialize rate limit trackers
        for (const account of provider.accounts) {
          this.rateLimitTrackers.set(account.id, { ...account.rateLimit });
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }

  private initializeDefaultProviders(): void {
    // Initialize default providers if none exist
    if (this.providers.size === 0) {
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
            baseURL: 'https://api.openai.com/v1',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 4096,
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
            baseURL: 'https://api.anthropic.com',
            model: 'claude-3-sonnet-20240229',
            temperature: 0.7,
            maxTokens: 4096,
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
            baseURL: 'https://api.cohere.ai',
            model: 'command-r-plus',
            temperature: 0.7,
            maxTokens: 4096,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0
          }
        }
      ];

      for (const provider of defaultProviders) {
        this.providers.set(provider.id, provider);
      }

      this.saveProviders();
    }
  }

  async addAccount(providerId: string, account: Omit<AIAccount, 'id' | 'providerId'>): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error('Provider not found');

    const accountId = `${providerId}_${Date.now()}`;
    const newAccount: AIAccount = {
      id: accountId,
      providerId,
      ...account,
      rateLimit: this.getDefaultRateLimit(provider.type),
      usage: this.getDefaultUsage()
    };

    provider.accounts.push(newAccount);
    provider.status = 'connected';
    
    this.rateLimitTrackers.set(accountId, { ...newAccount.rateLimit });
    
    await this.saveProvider(provider);
    return accountId;
  }

  private getDefaultRateLimit(type: string): RateLimit {
    const limits = {
      openai: { requestsPerMinute: 60, requestsPerHour: 3600, requestsPerDay: 10000, tokensPerMinute: 150000 },
      anthropic: { requestsPerMinute: 50, requestsPerHour: 1000, requestsPerDay: 5000, tokensPerMinute: 100000 },
      google: { requestsPerMinute: 60, requestsPerHour: 1500, requestsPerDay: 15000, tokensPerMinute: 300000 },
      cohere: { requestsPerMinute: 100, requestsPerHour: 1000, requestsPerDay: 10000, tokensPerMinute: 100000 },
      local: { requestsPerMinute: 1000, requestsPerHour: 10000, requestsPerDay: 100000, tokensPerMinute: 1000000 }
    };

    const limit = limits[type] || limits.openai;
    return {
      ...limit,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000) // 1 minute from now
    };
  }

  private getDefaultUsage(): Usage {
    return {
      requestsToday: 0,
      tokensToday: 0,
      costToday: 0,
      lastUsed: new Date(),
      totalRequests: 0,
      totalTokens: 0
    };
  }

  async sendMessage(request: AIRequest, providerId?: string): Promise<AIResponse> {
    const account = await this.selectBestAccount(providerId);
    if (!account) {
      throw new Error('No available AI accounts');
    }

    // Check rate limits
    if (!this.canMakeRequest(account.id)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
      const response = await this.makeAPIRequest(account, request);
      await this.updateUsage(account.id, response.usage);
      return response;
    } catch (error) {
      await this.handleAPIError(account.id, error);
      throw error;
    }
  }

  private async selectBestAccount(preferredProvider?: string): Promise<AIAccount | null> {
    const availableAccounts: AIAccount[] = [];

    for (const provider of this.providers.values()) {
      if (preferredProvider && provider.id !== preferredProvider) continue;
      if (provider.status !== 'connected') continue;

      for (const account of provider.accounts) {
        if (account.isActive && this.canMakeRequest(account.id)) {
          availableAccounts.push(account);
        }
      }
    }

    if (availableAccounts.length === 0) return null;

    // Select account with lowest usage ratio
    return availableAccounts.reduce((best, current) => {
      const bestRatio = this.getUsageRatio(best.id);
      const currentRatio = this.getUsageRatio(current.id);
      return currentRatio < bestRatio ? current : best;
    });
  }

  private canMakeRequest(accountId: string): boolean {
    const limits = this.rateLimitTrackers.get(accountId);
    if (!limits) return false;

    const now = Date.now();
    if (now >= limits.resetTime.getTime()) {
      this.resetRateLimit(accountId);
      return true;
    }

    return limits.currentRequests < limits.requestsPerMinute;
  }

  private getUsageRatio(accountId: string): number {
    const limits = this.rateLimitTrackers.get(accountId);
    if (!limits) return 1;

    const requestRatio = limits.currentRequests / limits.requestsPerMinute;
    const tokenRatio = limits.currentTokens / limits.tokensPerMinute;
    
    return Math.max(requestRatio, tokenRatio);
  }

  private resetRateLimit(accountId: string): void {
    const limits = this.rateLimitTrackers.get(accountId);
    if (limits) {
      limits.currentRequests = 0;
      limits.currentTokens = 0;
      limits.resetTime = new Date(Date.now() + 60000); // Next minute
    }
  }

  private async makeAPIRequest(account: AIAccount, request: AIRequest): Promise<AIResponse> {
    const provider = this.providers.get(account.providerId);
    if (!provider) throw new Error('Provider not found');

    // Increment rate limit counters
    const limits = this.rateLimitTrackers.get(account.id);
    if (limits) {
      limits.currentRequests++;
    }

    // Mock response for now - in production, this would make real API calls
    const mockResponse: AIResponse = {
      content: this.generateMockResponse(request, provider.name),
      model: provider.config.model,
      usage: {
        promptTokens: this.estimateTokens(request.messages.map(m => m.content).join(' ')),
        completionTokens: 100,
        totalTokens: 0
      }
    };
    
    mockResponse.usage.totalTokens = mockResponse.usage.promptTokens + mockResponse.usage.completionTokens;
    
    // Update token counter
    if (limits) {
      limits.currentTokens += mockResponse.usage.totalTokens;
    }

    return mockResponse;
  }

  private generateMockResponse(request: AIRequest, providerName: string): string {
    const lastMessage = request.messages[request.messages.length - 1];
    const userQuery = lastMessage?.content || '';

    // Generate contextual responses based on common development queries
    if (userQuery.toLowerCase().includes('create') || userQuery.toLowerCase().includes('build')) {
      return `I'll help you create that using ${providerName}. Let me analyze your requirements and generate the appropriate code structure. This is a demo response - in the full implementation, I'll connect to the real ${providerName} API with intelligent key rotation to avoid rate limits.

Based on your request, here's what I suggest:

1. **Architecture**: We'll use a modular approach
2. **Components**: Break down into reusable parts  
3. **State Management**: Implement proper data flow
4. **Testing**: Add comprehensive test coverage

Would you like me to start with any specific part?`;
    }

    if (userQuery.toLowerCase().includes('fix') || userQuery.toLowerCase().includes('debug')) {
      return `I'm analyzing the issue using ${providerName}. Let me examine the code and identify potential problems:

**Possible Issues Found:**
- Component lifecycle problems
- State synchronization issues
- Missing error boundaries
- Performance bottlenecks

**Recommended Solutions:**
1. Add proper error handling
2. Implement loading states
3. Optimize re-renders
4. Add input validation

This is a demonstration response. The production version will use real ${providerName} analysis with multi-account load balancing.`;
    }

    return `Hello! I'm responding via ${providerName} with intelligent key rotation. Your message: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"

I understand you're working on development tasks. I can help with:
- Code generation and refactoring
- Architecture planning and design
- Debugging and optimization
- Testing and deployment

This is a demo response showcasing the multi-provider system. In production, I'll use real API connections with automatic failover and rate limit management across multiple accounts.`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async updateUsage(accountId: string, usage: { totalTokens: number }): Promise<void> {
    for (const provider of this.providers.values()) {
      const account = provider.accounts.find(a => a.id === accountId);
      if (account) {
        account.usage.requestsToday++;
        account.usage.tokensToday += usage.totalTokens;
        account.usage.totalRequests++;
        account.usage.totalTokens += usage.totalTokens;
        account.usage.lastUsed = new Date();
        
        await this.saveProvider(provider);
        break;
      }
    }
  }

  private async handleAPIError(accountId: string, error: any): Promise<void> {
    console.error(`API Error for account ${accountId}:`, error);
    
    // Handle rate limit errors
    if (error.status === 429) {
      const provider = this.findProviderByAccountId(accountId);
      if (provider) {
        const account = provider.accounts.find(a => a.id === accountId);
        if (account) {
          // Temporarily disable account
          account.isActive = false;
          await this.saveProvider(provider);
          
          // Re-enable after delay
          setTimeout(async () => {
            account.isActive = true;
            await this.saveProvider(provider);
          }, 60000); // 1 minute delay
        }
      }
    }
  }

  private findProviderByAccountId(accountId: string): AIProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.accounts.some(a => a.id === accountId)) {
        return provider;
      }
    }
    return undefined;
  }

  private startRateLimitReset(): void {
    // Reset rate limits every minute
    setInterval(() => {
      const now = Date.now();
      for (const [accountId, limits] of this.rateLimitTrackers) {
        if (now >= limits.resetTime.getTime()) {
          this.resetRateLimit(accountId);
        }
      }
    }, 60000);
  }

  async getProviders(): Promise<AIProvider[]> {
    return Array.from(this.providers.values());
  }

  async getProvider(id: string): Promise<AIProvider | undefined> {
    return this.providers.get(id);
  }

  private async saveProvider(provider: AIProvider): Promise<void> {
    this.providers.set(provider.id, provider);
    await storageService.saveProvider(provider);
  }

  private async saveProviders(): Promise<void> {
    for (const provider of this.providers.values()) {
      await storageService.saveProvider(provider);
    }
  }

  async removeAccount(providerId: string, accountId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.accounts = provider.accounts.filter(a => a.id !== accountId);
      if (provider.accounts.length === 0) {
        provider.status = 'disconnected';
      }
      this.rateLimitTrackers.delete(accountId);
      await this.saveProvider(provider);
    }
  }

  async toggleAccount(accountId: string, isActive: boolean): Promise<void> {
    for (const provider of this.providers.values()) {
      const account = provider.accounts.find(a => a.id === accountId);
      if (account) {
        account.isActive = isActive;
        await this.saveProvider(provider);
        break;
      }
    }
  }

  getUsageStats(): Record<string, {
    requestsToday: number;
    tokensToday: number;
    activeAccounts: number;
    totalAccounts: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const provider of this.providers.values()) {
      stats[provider.id] = {
        requestsToday: provider.accounts.reduce((sum, acc) => sum + acc.usage.requestsToday, 0),
        tokensToday: provider.accounts.reduce((sum, acc) => sum + acc.usage.tokensToday, 0),
        activeAccounts: provider.accounts.filter(acc => acc.isActive).length,
        totalAccounts: provider.accounts.length
      };
    }
    
    return stats;
  }
}

export const aiProviderService = new AIProviderService();