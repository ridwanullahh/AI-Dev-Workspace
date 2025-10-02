import { db, encryptionService } from '../database/schema';
import { realOAuthService } from './realOAuth';
import type { Account } from '../database/schema';

interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
}

interface AIResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  provider: string;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure: Date;
  nextRetry: Date;
}

export class EnhancedAIProviderService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private requestQueues = new Map<string, Array<{ resolve: Function; reject: Function; request: AIRequest }>>();
  private rateLimiters = new Map<string, { requests: number; tokens: number; resetTime: Date }>();

  // Circuit breaker configuration
  private readonly CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenRetries: 3
  };

  // Provider-specific rate limits
  private readonly RATE_LIMITS = {
    gemini: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    openai: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000,
      requestsPerHour: 3600,
      requestsPerDay: 10000
    }
  };

  // Model pricing (per 1K tokens)
  private readonly MODEL_PRICING = {
    'gemini-pro': 0.0005,
    'gemini-pro-vision': 0.002,
    'gpt-3.5-turbo': 0.0015,
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01
  };

  async sendMessage(request: AIRequest, providerId?: string): Promise<AIResponse> {
    // Get best available account
    const account = await this.selectBestAccount(providerId);
    if (!account) {
      throw new Error('No available accounts for AI requests');
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(account.id)) {
      throw new Error('Circuit breaker is open for this account');
    }

    // Check rate limits
    await this.enforceRateLimit(account);

    try {
      // Make request with retry logic
      const response = await this.makeRequestWithRetry(account, request);
      
      // Update usage tracking
      await this.updateUsageTracking(account, response.usage.totalTokens);
      
      // Record success
      this.recordSuccess(account.id);
      
      return response;
    } catch (error) {
      // Record failure and update circuit breaker
      this.recordFailure(account.id, error);
      throw error;
    }
  }

  async sendMessageStream(
    request: AIRequest, 
    onToken: (token: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: Error) => void,
    providerId?: string
  ): Promise<void> {
    const account = await this.selectBestAccount(providerId);
    if (!account) {
      throw new Error('No available accounts for AI requests');
    }

    if (this.isCircuitBreakerOpen(account.id)) {
      throw new Error('Circuit breaker is open for this account');
    }

    await this.enforceRateLimit(account);

    try {
      await this.makeStreamingRequest(account, request, onToken, onComplete, onError);
      this.recordSuccess(account.id);
    } catch (error) {
      this.recordFailure(account.id, error);
      onError(error as Error);
    }
  }

  private async selectBestAccount(providerId?: string): Promise<Account | null> {
    const accounts = providerId 
      ? await realOAuthService.getActiveAccounts(providerId)
      : await db.accounts.where('isActive').equals(1).and(acc => !acc.health.circuitBreakerOpen).toArray();

    if (accounts.length === 0) return null;

    // Weighted round-robin selection
    const totalWeight = accounts.reduce((sum, acc) => sum + acc.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const account of accounts) {
      random -= account.weight;
      if (random <= 0) {
        // Refresh token if needed
        return await realOAuthService.refreshTokenIfNeeded(account);
      }
    }

    return accounts[0]; // Fallback
  }

  private async makeRequestWithRetry(account: Account, request: AIRequest, retries = 3): Promise<AIResponse> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.makeRequest(account, request);
        return response;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const isRetryableError = this.isRetryableError(error);
        
        if (isLastAttempt || !isRetryableError) {
          throw error;
        }

        // Exponential backoff with jitter
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = Math.random() * 0.1 * backoffMs;
        await new Promise(resolve => setTimeout(resolve, backoffMs + jitter));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async makeRequest(account: Account, request: AIRequest): Promise<AIResponse> {
    const tokens = JSON.parse(encryptionService.decrypt(account.encryptedTokens));
    const providerId = account.providerId;

    if (providerId === 'gemini') {
      return await this.makeGeminiRequest(tokens.access_token, request);
    } else if (providerId === 'openai') {
      return await this.makeOpenAIRequest(tokens.access_token, request);
    } else {
      throw new Error(`Unsupported provider: ${providerId}`);
    }
  }

  private async makeGeminiRequest(accessToken: string, request: AIRequest): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`;
    
    const body = {
      contents: request.messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      systemInstruction: request.messages.find(msg => msg.role === 'system')?.content,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 4096
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Estimate token usage (Gemini doesn't provide detailed usage)
    const promptTokens = this.estimateTokens(request.messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);
    const totalTokens = promptTokens + completionTokens;

    return {
      id: `gemini_${Date.now()}`,
      content,
      model: request.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      cost: this.calculateCost(request.model, totalTokens),
      provider: 'gemini'
    };
  }

  private async makeOpenAIRequest(apiKey: string, request: AIRequest): Promise<AIResponse> {
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      id: data.id,
      content,
      model: data.model,
      usage: data.usage,
      cost: this.calculateCost(data.model, data.usage.total_tokens),
      provider: 'openai'
    };
  }

  private async makeStreamingRequest(
    account: Account,
    request: AIRequest,
    onToken: (token: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const tokens = JSON.parse(encryptionService.decrypt(account.encryptedTokens));
    
    try {
      if (account.providerId === 'gemini') {
        await this.makeGeminiStreamRequest(tokens.access_token, request, onToken, onComplete);
      } else if (account.providerId === 'openai') {
        await this.makeOpenAIStreamRequest(tokens.access_token, request, onToken, onComplete);
      } else {
        throw new Error(`Streaming not supported for provider: ${account.providerId}`);
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  private async makeGeminiStreamRequest(
    accessToken: string,
    request: AIRequest,
    onToken: (token: string) => void,
    onComplete: (response: AIResponse) => void
  ): Promise<void> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:streamGenerateContent`;
    
    const body = {
      contents: request.messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      systemInstruction: request.messages.find(msg => msg.role === 'system')?.content,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 4096
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (token) {
                content += token;
                onToken(token);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Calculate final response
      const promptTokens = this.estimateTokens(request.messages.map(m => m.content).join(' '));
      const completionTokens = this.estimateTokens(content);
      const totalTokens = promptTokens + completionTokens;

      onComplete({
        id: `gemini_stream_${Date.now()}`,
        content,
        model: request.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        cost: this.calculateCost(request.model, totalTokens),
        provider: 'gemini'
      });
    } finally {
      reader.releaseLock();
    }
  }

  private async makeOpenAIStreamRequest(
    apiKey: string,
    request: AIRequest,
    onToken: (token: string) => void,
    onComplete: (response: AIResponse) => void
  ): Promise<void> {
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                content += token;
                onToken(token);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Estimate usage for completion
      const promptTokens = this.estimateTokens(request.messages.map(m => m.content).join(' '));
      const completionTokens = this.estimateTokens(content);
      const totalTokens = promptTokens + completionTokens;

      onComplete({
        id: `openai_stream_${Date.now()}`,
        content,
        model: request.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        cost: this.calculateCost(request.model, totalTokens),
        provider: 'openai'
      });
    } finally {
      reader.releaseLock();
    }
  }

  private async enforceRateLimit(account: Account): Promise<void> {
    const now = new Date();
    const limits = this.RATE_LIMITS[account.providerId] || this.RATE_LIMITS.openai;
    
    let limiter = this.rateLimiters.get(account.id);
    if (!limiter || now >= limiter.resetTime) {
      limiter = {
        requests: 0,
        tokens: 0,
        resetTime: new Date(now.getTime() + 60000) // Reset every minute
      };
      this.rateLimiters.set(account.id, limiter);
    }

    if (limiter.requests >= limits.requestsPerMinute) {
      const waitTime = limiter.resetTime.getTime() - now.getTime();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime/1000)} seconds.`);
    }

    limiter.requests++;
  }

  private async updateUsageTracking(account: Account, tokens: number): Promise<void> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Reset daily counters if needed
    const shouldReset = account.usage.lastReset < today;
    
    await db.accounts.update(account.id, {
      usage: {
        requestsToday: shouldReset ? 1 : account.usage.requestsToday + 1,
        tokensToday: shouldReset ? tokens : account.usage.tokensToday + tokens,
        lastReset: shouldReset ? today : account.usage.lastReset
      },
      updatedAt: now
    });

    // Update rate limiter
    const limiter = this.rateLimiters.get(account.id);
    if (limiter) {
      limiter.tokens += tokens;
    }
  }

  private isCircuitBreakerOpen(accountId: string): boolean {
    const breaker = this.circuitBreakers.get(accountId);
    if (!breaker) return false;

    if (breaker.isOpen) {
      const now = new Date();
      if (now >= breaker.nextRetry) {
        // Half-open state - allow limited retries
        breaker.isOpen = false;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(accountId: string): void {
    const breaker = this.circuitBreakers.get(accountId);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  private recordFailure(accountId: string, error: any): void {
    let breaker = this.circuitBreakers.get(accountId);
    if (!breaker) {
      breaker = {
        isOpen: false,
        failures: 0,
        lastFailure: new Date(),
        nextRetry: new Date()
      };
      this.circuitBreakers.set(accountId, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = new Date();

    if (breaker.failures >= this.CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      breaker.isOpen = true;
      breaker.nextRetry = new Date(Date.now() + this.CIRCUIT_BREAKER_CONFIG.resetTimeout);
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || '';
    const status = error.status || 0;
    
    // Retry on rate limits, timeouts, and server errors
    return status === 429 || 
           status >= 500 || 
           message.includes('timeout') ||
           message.includes('network');
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: string, tokens: number): number {
    const pricePerToken = this.MODEL_PRICING[model] || this.MODEL_PRICING['gpt-3.5-turbo'];
    return (tokens / 1000) * pricePerToken;
  }

  // Account management methods
  async getAccountStatistics(): Promise<{ 
    accountId: string; 
    requests: number; 
    tokens: number; 
    cost: number; 
    health: string 
  }[]> {
    const accounts = await db.accounts.toArray();
    return accounts.map(account => ({
      accountId: account.id,
      requests: account.usage.requestsToday,
      tokens: account.usage.tokensToday,
      cost: this.calculateCost('gpt-3.5-turbo', account.usage.tokensToday), // Default cost estimate
      health: account.health.status
    }));
  }

  async resetCircuitBreaker(accountId: string): Promise<void> {
    this.circuitBreakers.delete(accountId);
    await db.accounts.update(accountId, {
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
        circuitBreakerOpen: false
      },
      updatedAt: new Date()
    });
  }
}

export const enhancedAIProvider = new EnhancedAIProviderService();