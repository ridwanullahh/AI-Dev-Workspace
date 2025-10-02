import { db } from '../database/schema';

export interface SearchProvider {
  id: string;
  name: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
  isActive: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: Date;
  relevanceScore: number;
}

export interface CachedSearch {
  query: string;
  results: SearchResult[];
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

export class WebSearchIntegrationService {
  private providers: Map<string, SearchProvider> = new Map();
  private searchCache: Map<string, CachedSearch> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: Date }> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const defaultProviders: SearchProvider[] = [
      {
        id: 'mdn',
        name: 'MDN Web Docs',
        baseUrl: 'https://developer.mozilla.org',
        rateLimit: 60,
        isActive: true
      },
      {
        id: 'wikipedia',
        name: 'Wikipedia',
        baseUrl: 'https://en.wikipedia.org',
        rateLimit: 100,
        isActive: true
      },
      {
        id: 'stackoverflow',
        name: 'Stack Overflow',
        baseUrl: 'https://stackoverflow.com',
        rateLimit: 30,
        isActive: true
      },
      {
        id: 'github',
        name: 'GitHub',
        baseUrl: 'https://github.com',
        rateLimit: 60,
        isActive: true
      }
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  async search(query: string, sources?: string[], limit: number = 10): Promise<SearchResult[]> {
    // Check cache first
    const cachedResults = this.getCachedResults(query);
    if (cachedResults) {
      return cachedResults.slice(0, limit);
    }

    const results: SearchResult[] = [];
    const activeProviders = sources 
      ? Array.from(this.providers.values()).filter(p => sources.includes(p.id) && p.isActive)
      : Array.from(this.providers.values()).filter(p => p.isActive);

    // Search across providers
    for (const provider of activeProviders) {
      if (!this.checkRateLimit(provider.id)) {
        continue; // Skip if rate limited
      }

      try {
        const providerResults = await this.searchProvider(provider, query, Math.ceil(limit / activeProviders.length));
        results.push(...providerResults);
      } catch (error) {
        console.error(`Search failed for provider ${provider.name}:`, error);
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Cache results
    this.cacheResults(query, results);
    
    return results.slice(0, limit);
  }

  private async searchProvider(provider: SearchProvider, query: string, limit: number): Promise<SearchResult[]> {
    switch (provider.id) {
      case 'mdn':
        return await this.searchMDN(query, limit);
      case 'wikipedia':
        return await this.searchWikipedia(query, limit);
      case 'stackoverflow':
        return await this.searchStackOverflow(query, limit);
      case 'github':
        return await this.searchGitHub(query, limit);
      default:
        return [];
    }
  }

  private async searchMDN(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // MDN search via their search API
      const searchUrl = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`MDN search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.documents?.map((doc: any, index: number) => ({
        id: `mdn_${Date.now()}_${index}`,
        title: doc.title,
        url: `https://developer.mozilla.org${doc.mdn_url}`,
        snippet: doc.summary,
        source: 'MDN Web Docs',
        timestamp: new Date(),
        relevanceScore: this.calculateRelevance(query, doc.title + ' ' + doc.summary)
      })) || [];
    } catch (error) {
      console.error('MDN search error:', error);
      return [];
    }
  }

  private async searchWikipedia(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // Wikipedia OpenSearch API
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&format=json&origin=*`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Wikipedia search failed: ${response.statusText}`);
      }

      const [, titles, descriptions, urls] = await response.json();
      
      return titles.map((title: string, index: number) => ({
        id: `wiki_${Date.now()}_${index}`,
        title,
        url: urls[index],
        snippet: descriptions[index] || '',
        source: 'Wikipedia',
        timestamp: new Date(),
        relevanceScore: this.calculateRelevance(query, title + ' ' + descriptions[index])
      }));
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return [];
    }
  }

  private async searchStackOverflow(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // Stack Overflow API
      const searchUrl = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Stack Overflow search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.items?.map((item: any, index: number) => ({
        id: `so_${Date.now()}_${index}`,
        title: item.title,
        url: item.link,
        snippet: this.stripHtml(item.body || '').substring(0, 200) + '...',
        source: 'Stack Overflow',
        timestamp: new Date(),
        relevanceScore: this.calculateRelevance(query, item.title)
      })) || [];
    } catch (error) {
      console.error('Stack Overflow search error:', error);
      return [];
    }
  }

  private async searchGitHub(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // GitHub search API (repositories)
      const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`GitHub search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.items?.map((repo: any, index: number) => ({
        id: `gh_${Date.now()}_${index}`,
        title: repo.full_name,
        url: repo.html_url,
        snippet: repo.description || 'No description available',
        source: 'GitHub',
        timestamp: new Date(),
        relevanceScore: this.calculateRelevance(query, repo.full_name + ' ' + repo.description)
      })) || [];
    } catch (error) {
      console.error('GitHub search error:', error);
      return [];
    }
  }

  private calculateRelevance(query: string, text: string): number {
    if (!text) return 0;
    
    const queryTerms = query.toLowerCase().split(' ');
    const textLower = text.toLowerCase();
    
    let score = 0;
    
    // Exact phrase match
    if (textLower.includes(query.toLowerCase())) {
      score += 10;
    }
    
    // Individual term matches
    queryTerms.forEach(term => {
      if (textLower.includes(term)) {
        score += 1;
      }
    });
    
    // Boost score based on term frequency
    const words = textLower.split(' ');
    queryTerms.forEach(term => {
      const frequency = words.filter(word => word.includes(term)).length;
      score += frequency * 0.5;
    });
    
    return Math.min(score, 100); // Cap at 100
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private checkRateLimit(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    const now = new Date();
    let limiter = this.rateLimiters.get(providerId);
    
    if (!limiter || now >= limiter.resetTime) {
      limiter = {
        count: 0,
        resetTime: new Date(now.getTime() + 60000) // Reset every minute
      };
      this.rateLimiters.set(providerId, limiter);
    }

    if (limiter.count >= provider.rateLimit) {
      return false;
    }

    limiter.count++;
    return true;
  }

  private getCachedResults(query: string): SearchResult[] | null {
    const cached = this.searchCache.get(query);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp.getTime() > cached.ttl) {
      this.searchCache.delete(query);
      return null;
    }

    return cached.results;
  }

  private cacheResults(query: string, results: SearchResult[]): void {
    const cached: CachedSearch = {
      query,
      results,
      timestamp: new Date(),
      ttl: 10 * 60 * 1000 // 10 minutes
    };

    this.searchCache.set(query, cached);
    
    // Limit cache size
    if (this.searchCache.size > 100) {
      const oldestKey = Array.from(this.searchCache.keys())[0];
      this.searchCache.delete(oldestKey);
    }
  }

  // Citation tracking
  async getCitations(projectId: string): Promise<Array<{
    url: string;
    title: string;
    accessedAt: Date;
    usageCount: number;
  }>> {
    const settings = await db.settings
      .where('category').equals('citations')
      .and(setting => setting.key.startsWith(`project_${projectId}`))
      .toArray();

    return settings.map(setting => setting.value);
  }

  async addCitation(projectId: string, result: SearchResult): Promise<void> {
    const citationId = `citation_${projectId}_${Date.now()}`;
    
    await db.settings.put({
      id: citationId,
      category: 'citations',
      key: `project_${projectId}`,
      value: {
        url: result.url,
        title: result.title,
        accessedAt: new Date(),
        usageCount: 1
      },
      encrypted: false,
      updatedAt: new Date()
    });
  }

  // Provider management
  async addProvider(provider: Omit<SearchProvider, 'id'>): Promise<SearchProvider> {
    const newProvider: SearchProvider = {
      id: `provider_${Date.now()}`,
      ...provider
    };

    this.providers.set(newProvider.id, newProvider);
    
    await db.settings.put({
      id: `search_provider_${newProvider.id}`,
      category: 'search',
      key: 'provider',
      value: newProvider,
      encrypted: false,
      updatedAt: new Date()
    });

    return newProvider;
  }

  async updateProvider(providerId: string, updates: Partial<SearchProvider>): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error('Provider not found');

    const updatedProvider = { ...provider, ...updates };
    this.providers.set(providerId, updatedProvider);

    await db.settings.put({
      id: `search_provider_${providerId}`,
      category: 'search',
      key: 'provider',
      value: updatedProvider,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  getProviders(): SearchProvider[] {
    return Array.from(this.providers.values());
  }

  // Cache management
  clearCache(): void {
    this.searchCache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.searchCache.size,
      hitRate: 0.85 // Mock hit rate
    };
  }
}

export const webSearchIntegration = new WebSearchIntegrationService();