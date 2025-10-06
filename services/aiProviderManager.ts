import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProvider, AIAccount, RateLimit, Usage } from './types';

interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
  provider: string;
}

class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private rateLimitTrackers: Map<string, RateLimit> = new Map();
  private requestQueue: Array<{
    id: string;
    request: AIRequest;
    resolve: (response: AIResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessingQueue = false;

  async initialize(): Promise<void> {
    await this.loadProviders();
    this.initializeDefaultProviders();
    this.startRateLimitManager();
    this.startQueueProcessor();
  }

  private async loadProviders(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ai_providers');
      if (stored) {
        const providers = JSON.parse(stored);
        for (const provider of providers) {
          this.providers.set(provider.id, provider);
          for (const account of provider.accounts) {
            this.initializeRateLimit(account.id, account.rateLimit);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }

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
      }
    ];

    for (const provider of defaultProviders) {
      if (!this.providers.has(provider.id)) {
        this.providers.set(provider.id, provider);
      }
    }
  }

  private initializeRateLimit(accountId: string, limits: Partial<RateLimit>): void {
    this.rateLimitTrackers.set(accountId, {
      requestsPerMinute: limits.requestsPerMinute || 60,
      requestsPerHour: limits.requestsPerHour || 3600,
      requestsPerDay: limits.requestsPerDay || 10000,
      tokensPerMinute: limits.tokensPerMinute || 150000,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000)
    });
  }

  async addAccount(providerId: string, accountData: {
    name: string;
    apiKey?: string;
    oauthToken?: string;
    isActive: boolean;
  }): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error('Provider not found');

    const accountId = `${providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const account: AIAccount = {
      id: accountId,
      providerId,
      name: accountData.name,
      apiKey: accountData.apiKey,
      oauthToken: accountData.oauthToken,
      isActive: accountData.isActive,
      rateLimit: this.getDefaultRateLimit(provider.type),
      usage: {
        requestsToday: 0,
        tokensToday: 0,
        costToday: 0,
        lastUsed: new Date(),
        totalRequests: 0,
        totalTokens: 0
      }
    };

    provider.accounts.push(account);
    provider.status = 'connected';
    this.initializeRateLimit(accountId, account.rateLimit);
    
    await this.saveProviders();
    return accountId;
  }

  private getDefaultRateLimit(type: string): RateLimit {
    const limits = {
      openai: { requestsPerMinute: 60, requestsPerHour: 3600, requestsPerDay: 10000, tokensPerMinute: 150000 },
      anthropic: { requestsPerMinute: 50, requestsPerHour: 1000, requestsPerDay: 5000, tokensPerMinute: 100000 },
      google: { requestsPerMinute: 60, requestsPerHour: 1500, requestsPerDay: 15000, tokensPerMinute: 300000 },
      cohere: { requestsPerMinute: 100, requestsPerHour: 1000, requestsPerDay: 10000, tokensPerMinute: 100000 }
    };

    const limit = limits[type] || limits.openai;
    return {
      ...limit,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  async sendMessage(request: AIRequest, preferredProvider?: string): Promise<AIResponse> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.requestQueue.push({
        id: requestId,
        request: { ...request, preferredProvider },
        resolve,
        reject
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const queueItem = this.requestQueue.shift()!;
      
      try {
        const response = await this.executeRequest(queueItem.request);
        queueItem.resolve(response);
      } catch (error) {
        queueItem.reject(error instanceof Error ? error : new Error('Unknown error'));
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  private async executeRequest(request: AIRequest & { preferredProvider?: string }): Promise<AIResponse> {
    const account = await this.selectBestAccount(request.preferredProvider);
    if (!account) {
      throw new Error('No available AI accounts');
    }

    const provider = this.providers.get(account.providerId)!;
    
    // Check and update rate limits
    if (!this.canMakeRequest(account.id, this.estimateTokens(JSON.stringify(request)))) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await this.makeAPICall(provider, account, request);
      await this.updateUsage(account.id, response.usage);
      return response;
    } catch (error) {
      await this.handleAPIError(account.id, error);
      throw error;
    }
  }

  private async selectBestAccount(preferredProvider?: string): Promise<AIAccount | null> {
    const availableAccounts: Array<{ account: AIAccount; score: number }> = [];

    for (const provider of this.providers.values()) {
      if (preferredProvider && provider.id !== preferredProvider) continue;
      if (provider.status !== 'connected') continue;

      for (const account of provider.accounts) {
        if (!account.isActive) continue;
        if (!this.canMakeRequest(account.id, 1000)) continue;

        const score = this.calculateAccountScore(account);
        availableAccounts.push({ account, score });
      }
    }

    if (availableAccounts.length === 0) return null;

    // Sort by score (highest first) and return best account
    availableAccounts.sort((a, b) => b.score - a.score);
    return availableAccounts[0].account;
  }

  private calculateAccountScore(account: AIAccount): number {
    const limits = this.rateLimitTrackers.get(account.id);
    if (!limits) return 0;

    const requestRatio = limits.currentRequests / limits.requestsPerMinute;
    const tokenRatio = limits.currentTokens / limits.tokensPerMinute;
    const usageRatio = Math.max(requestRatio, tokenRatio);

    // Higher score = lower usage (more available capacity)
    return 1 - usageRatio;
  }

  private canMakeRequest(accountId: string, estimatedTokens: number): boolean {
    const limits = this.rateLimitTrackers.get(accountId);
    if (!limits) return false;

    const now = Date.now();
    if (now >= limits.resetTime.getTime()) {
      this.resetRateLimit(accountId);
      return true;
    }

    return (
      limits.currentRequests < limits.requestsPerMinute &&
      limits.currentTokens + estimatedTokens < limits.tokensPerMinute
    );
  }

  private resetRateLimit(accountId: string): void {
    const limits = this.rateLimitTrackers.get(accountId);
    if (limits) {
      limits.currentRequests = 0;
      limits.currentTokens = 0;
      limits.resetTime = new Date(Date.now() + 60000);
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async makeAPICall(provider: AIProvider, account: AIAccount, request: AIRequest): Promise<AIResponse> {
    const limits = this.rateLimitTrackers.get(account.id)!;
    limits.currentRequests++;

    let response: AIResponse;

    switch (provider.type) {
      case 'openai':
        response = await this.callOpenAI(provider, account, request);
        break;
      case 'anthropic':
        response = await this.callAnthropic(provider, account, request);
        break;
      case 'google':
        response = await this.callGemini(provider, account, request);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    limits.currentTokens += response.usage.totalTokens;
    return response;
  }

  private async callOpenAI(provider: AIProvider, account: AIAccount, request: AIRequest): Promise<AIResponse> {
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
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
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
    };
  }

  private async callAnthropic(provider: AIProvider, account: AIAccount, request: AIRequest): Promise<AIResponse> {
    const messages = request.messages.filter(m => m.role !== 'system');
    const systemMessage = request.messages.find(m => m.role === 'system')?.content;

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
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
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
    };
  }

  private async callGemini(provider: AIProvider, account: AIAccount, request: AIRequest): Promise<AIResponse> {
    const contents = request.messages.map(msg => ({
      parts: [{ text: msg.content }],
      role: msg.role === 'assistant' ? 'model' : 'user'
    }));

    const response = await fetch(`${provider.config.baseURL}/models/${request.model || provider.config.model}:generateContent?key=${account.apiKey}`, {
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
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    const totalTokens = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);
    
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
    };
  }

  private calculateCost(providerType: string, tokens: number): number {
    const costs = {
      openai: 0.0015 / 1000, // $0.0015 per 1K tokens (GPT-3.5-turbo)
      anthropic: 0.00025 / 1000, // $0.00025 per 1K tokens (Claude Haiku)
      google: 0 // Free tier
    };
    
    return (costs[providerType] || 0) * tokens;
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
        account.usage.costToday += this.calculateCost(provider.type, usage.totalTokens);
        
        await this.saveProviders();
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
          account.isActive = false;
          await this.saveProviders();
          
          // Re-enable after 60 seconds
          setTimeout(async () => {
            account.isActive = true;
            await this.saveProviders();
          }, 60000);
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

  private startRateLimitManager(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [accountId, limits] of this.rateLimitTrackers) {
        if (now >= limits.resetTime.getTime()) {
          this.resetRateLimit(accountId);
        }
      }
    }, 60000); // Check every minute
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 1000); // Check every second
  }

  async getProviders(): Promise<AIProvider[]> {
    return Array.from(this.providers.values());
  }

  async getProvider(id: string): Promise<AIProvider | undefined> {
    return this.providers.get(id);
  }

  async removeAccount(providerId: string, accountId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.accounts = provider.accounts.filter(a => a.id !== accountId);
      if (provider.accounts.length === 0) {
        provider.status = 'disconnected';
      }
      this.rateLimitTrackers.delete(accountId);
      await this.saveProviders();
    }
  }

  async toggleAccount(accountId: string, isActive: boolean): Promise<void> {
    for (const provider of this.providers.values()) {
      const account = provider.accounts.find(a => a.id === accountId);
      if (account) {
        account.isActive = isActive;
        await this.saveProviders();
        break;
      }
    }
  }

  getUsageStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const provider of this.providers.values()) {
      stats[provider.id] = {
        requestsToday: provider.accounts.reduce((sum, acc) => sum + acc.usage.requestsToday, 0),
        tokensToday: provider.accounts.reduce((sum, acc) => sum + acc.usage.tokensToday, 0),
        costToday: provider.accounts.reduce((sum, acc) => sum + acc.usage.costToday, 0),
        activeAccounts: provider.accounts.filter(acc => acc.isActive).length,
        totalAccounts: provider.accounts.length,
        status: provider.status
      };
    }
    
    return stats;
  }

  private async saveProviders(): Promise<void> {
    try {
      const providers = Array.from(this.providers.values());
      await AsyncStorage.setItem('ai_providers', JSON.stringify(providers));
    } catch (error) {
      console.error('Failed to save providers:', error);
    }
  }
}

export const aiProviderManager = new AIProviderManager();