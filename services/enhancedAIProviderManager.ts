import { AIProvider, AIAccount } from './types';
import { aiProviderService } from './aiProvider';

class EnhancedAIProviderManager {
  async initialize(): Promise<void> {
    await aiProviderService.initialize();
  }

  getProviders(): AIProvider[] {
    // This would need to be implemented in aiProviderService
    // For now, return empty array
    return [];
  }

  getStats(): {
    connectedProviders: number;
    activeAccounts: number;
    totalRequests: number;
    totalTokens: number;
  } {
    const stats = aiProviderService.getUsageStats();
    let connectedProviders = 0;
    let activeAccounts = 0;
    let totalRequests = 0;
    let totalTokens = 0;

    for (const [providerId, providerStats] of Object.entries(stats)) {
      if (providerStats.activeAccounts > 0) {
        connectedProviders++;
      }
      activeAccounts += providerStats.activeAccounts;
      totalRequests += providerStats.requestsToday;
      totalTokens += providerStats.tokensToday;
    }

    return {
      connectedProviders,
      activeAccounts,
      totalRequests,
      totalTokens
    };
  }

  async addAPIKeyAccount(providerId: string, name: string, apiKey: string): Promise<string> {
    return await aiProviderService.addAccount(providerId, {
      name,
      apiKey,
      isActive: true,
      rateLimit: {
        requestsPerMinute: 0,
        requestsPerHour: 0,
        requestsPerDay: 0,
        tokensPerMinute: 0,
        currentRequests: 0,
        currentTokens: 0,
        resetTime: new Date(),
      },
      usage: {
        requestsToday: 0,
        tokensToday: 0,
        costToday: 0,
        lastUsed: new Date(),
        totalRequests: 0,
        totalTokens: 0,
      },
    });
  }

  async addOAuthAccount(providerId: string, accountId: string): Promise<void> {
    // This would need to be implemented with OAuth token handling
    console.log(`Adding OAuth account ${accountId} to provider ${providerId}`);
    // For now, this is a placeholder
  }

  async removeAccount(providerId: string, accountId: string): Promise<void> {
    await aiProviderService.removeAccount(providerId, accountId);
  }

  async toggleAccount(accountId: string, isActive: boolean): Promise<void> {
    await aiProviderService.toggleAccount(accountId, isActive);
  }
}

export const enhancedAIProviderManager = new EnhancedAIProviderManager();