import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { localEmbeddingGenerator } from './localEmbeddingGenerator';
import { StorageService } from './StorageService';
import { VectorSearchResult } from './types';

interface SearchQuery {
  text: string;
  type?: 'code' | 'text' | 'all';
  projectId?: string;
  filters?: SearchFilters;
  ranking?: RankingConfig;
}

interface SearchFilters {
  language?: string;
  framework?: string;
  dateRange?: { start: Date; end: Date };
  fileType?: string;
  author?: string;
  tags?: string[];
  complexity?: { min: number; max: number };
}

interface RankingConfig {
  semanticWeight?: number;
  lexicalWeight?: number;
  recencyWeight?: number;
  popularityWeight?: number;
  relevanceThreshold?: number;
}

interface SearchResult extends VectorSearchResult {
  lexicalScore: number;
  semanticScore: number;
  recencyScore: number;
  popularityScore: number;
  finalScore: number;
  snippets: string[];
  highlights: string[];
  relatedResults: string[];
}

interface SearchIndex {
  id: string;
  name: string;
  type: 'semantic' | 'lexical' | 'hybrid';
  entries: SearchIndexEntry[];
  lastUpdated: Date;
  stats: IndexStats;
}

interface SearchIndexEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  keywords: string[];
  tfidfVector: number[];
  lastAccessed: Date;
  accessCount: number;
  relevanceScore: number;
}

interface IndexStats {
  totalEntries: number;
  averageEmbeddingDimension: number;
  totalKeywords: number;
  lastOptimized: Date;
  compressionRatio: number;
}

interface SearchPerformance {
  queryTime: number;
  resultsCount: number;
  cacheHit: boolean;
  indexUsed: string[];
  scoringTime: number;
}

class SemanticSearchEngine {
  private searchIndexes: Map<string, SearchIndex> = new Map();
  private queryCache: Map<string, SearchResult[]> = new Map();
  private searchHistory: SearchQuery[] = [];
  private performanceMetrics: SearchPerformance[] = [];
  private isInitialized = false;
  private maxCacheSize = 1000;
  private maxHistorySize = 100;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Semantic Search Engine...');
      
      // Load existing search indexes
      await this.loadSearchIndexes();
      
      // Load query cache
      await this.loadQueryCache();
      
      // Load search history
      await this.loadSearchHistory();
      
      // Initialize default indexes
      await this.initializeDefaultIndexes();
      
      this.isInitialized = true;
      console.log('Semantic Search Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Semantic Search Engine:', error);
      throw error;
    }
  }

  private async loadSearchIndexes(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData();
      // if (data && data.searchIndexes) {
      //   this.searchIndexes = new Map(data.searchIndexes);
      //   console.log(`Loaded ${this.searchIndexes.size} search indexes`);
      // }
    } catch (error) {
      console.error('Failed to load search indexes:', error);
    }
  }

  private async loadQueryCache(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData();
      // if (data && data.queryCache) {
      //   this.queryCache = new Map(data.queryCache);
      //   console.log(`Loaded ${this.queryCache.size} cached queries`);
      // }
    } catch (error) {
      console.error('Failed to load query cache:', error);
    }
  }

  private async loadSearchHistory(): Promise<void> {
    try {
      // const data = await StorageService.getVectorDatabaseData();
      // if (data && data.searchHistory) {
      //   this.searchHistory = data.searchHistory;
      //   console.log(`Loaded ${this.searchHistory.length} search history entries`);
      // }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }

  private async initializeDefaultIndexes(): Promise<void> {
    if (this.searchIndexes.size === 0) {
      // Create default indexes
      await this.createSearchIndex('global_semantic', 'Global Semantic Index', 'semantic');
      await this.createSearchIndex('global_lexical', 'Global Lexical Index', 'lexical');
      await this.createSearchIndex('global_hybrid', 'Global Hybrid Index', 'hybrid');
    }
  }

  async search(query: SearchQuery): Promise<{
    results: SearchResult[];
    performance: SearchPerformance;
    suggestions: string[];
    relatedQueries: string[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let performance: SearchPerformance = {
      queryTime: 0,
      resultsCount: 0,
      cacheHit: false,
      indexUsed: [],
      scoringTime: 0
    };

    // Generate cache key
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    if (this.queryCache.has(cacheKey)) {
      performance.cacheHit = true;
      performance.queryTime = Date.now() - startTime;
      performance.resultsCount = this.queryCache.get(cacheKey)!.length;
      
      return {
        results: this.queryCache.get(cacheKey)!,
        performance,
        suggestions: await this.generateSuggestions(query.text),
        relatedQueries: await this.getRelatedQueries(query)
      };
    }

    // Add to search history
    this.addToSearchHistory(query);

    // Generate query embedding
    const queryEmbedding = await localEmbeddingGenerator.generateEmbedding(query.text, {
      type: query.type === 'all' ? 'text' : query.type,
      useCache: true
    });

    // Extract keywords from query
    const queryKeywords = this.extractKeywords(query.text);

    // Search across relevant indexes
    const searchResults: SearchResult[] = [];
    const indexesToSearch = this.selectIndexesForQuery(query);

    for (const indexId of indexesToSearch) {
      const index = this.searchIndexes.get(indexId);
      if (index) {
        performance.indexUsed.push(indexId);
        const indexResults = await this.searchInIndex(index, query, queryEmbedding.embedding, queryKeywords);
        searchResults.push(...indexResults);
      }
    }

    // Remove duplicates and rank results
    const uniqueResults = this.deduplicateResults(searchResults);
    const rankedResults = await this.rankResults(uniqueResults, query);

    // Generate snippets and highlights
    const enrichedResults = await this.enrichResults(rankedResults, query);

    // Update performance metrics
    performance.queryTime = Date.now() - startTime;
    performance.resultsCount = enrichedResults.length;
    performance.scoringTime = performance.queryTime - 10; // Approximate

    // Cache results
    this.cacheResults(cacheKey, enrichedResults);

    // Update performance metrics
    this.performanceMetrics.push(performance);

    return {
      results: enrichedResults,
      performance,
      suggestions: await this.generateSuggestions(query.text),
      relatedQueries: await this.getRelatedQueries(query)
    };
  }

  private generateCacheKey(query: SearchQuery): string {
    const keyData = JSON.stringify({
      text: query.text,
      type: query.type,
      projectId: query.projectId,
      filters: query.filters,
      timestamp: Date.now()
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `search_${Math.abs(hash)}`;
  }

  private selectIndexesForQuery(query: SearchQuery): string[] {
    const indexes: string[] = [];
    
    // Always use hybrid index as primary
    indexes.push('global_hybrid');
    
    // Add specific indexes based on query type
    if (query.type === 'code') {
      indexes.push('code_semantic', 'code_lexical');
    } else if (query.type === 'text') {
      indexes.push('text_semantic', 'text_lexical');
    }
    
    // Add project-specific indexes if available
    if (query.projectId) {
      indexes.push(`${query.projectId}_semantic`, `${query.projectId}_lexical`);
    }
    
    return indexes.filter(indexId => this.searchIndexes.has(indexId));
  }

  private async searchInIndex(
    index: SearchIndex,
    query: SearchQuery,
    queryEmbedding: number[],
    queryKeywords: string[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const entry of index.entries) {
      // Apply filters
      if (!this.passesFilters(entry, query.filters)) {
        continue;
      }
      
      // Calculate semantic similarity
      const semanticScore = this.cosineSimilarity(queryEmbedding, entry.embedding);
      
      // Calculate lexical similarity
      const lexicalScore = this.calculateLexicalSimilarity(queryKeywords, entry.keywords, entry.tfidfVector);
      
      // Calculate recency score
      const recencyScore = this.calculateRecencyScore(entry.lastAccessed);
      
      // Calculate popularity score
      const popularityScore = this.calculatePopularityScore(entry.accessCount);
      
      // Calculate final score using ranking configuration
      const ranking = query.ranking || {};
      const semanticWeight = ranking.semanticWeight || 0.6;
      const lexicalWeight = ranking.lexicalWeight || 0.3;
      const recencyWeight = ranking.recencyWeight || 0.05;
      const popularityWeight = ranking.popularityWeight || 0.05;
      
      const finalScore = 
        (semanticScore * semanticWeight) +
        (lexicalScore * lexicalWeight) +
        (recencyScore * recencyWeight) +
        (popularityScore * popularityWeight);
      
      // Apply relevance threshold
      const threshold = ranking.relevanceThreshold || 0.3;
      if (finalScore >= threshold) {
        results.push({
          id: entry.id,
          content: entry.content,
          score: finalScore,
          metadata: entry.metadata,
          type: entry.metadata.type || 'text',
          lexicalScore,
          semanticScore,
          recencyScore,
          popularityScore,
          finalScore,
          snippets: [],
          highlights: [],
          relatedResults: []
        } as SearchResult);
      }
    }
    
    return results;
  }

  private passesFilters(entry: SearchIndexEntry, filters?: SearchFilters): boolean {
    if (!filters) return true;
    
    // Language filter
    if (filters.language && entry.metadata.language !== filters.language) {
      return false;
    }
    
    // Framework filter
    if (filters.framework && entry.metadata.framework !== filters.framework) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const entryDate = new Date(entry.metadata.timestamp || 0);
      if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // File type filter
    if (filters.fileType && entry.metadata.fileType !== filters.fileType) {
      return false;
    }
    
    // Author filter
    if (filters.author && entry.metadata.author !== filters.author) {
      return false;
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const entryTags = entry.metadata.tags || [];
      if (!filters.tags.some(tag => entryTags.includes(tag))) {
        return false;
      }
    }
    
    // Complexity filter
    if (filters.complexity) {
      const complexity = entry.metadata.complexity || 0.5;
      if (complexity < filters.complexity.min || complexity > filters.complexity.max) {
        return false;
      }
    }
    
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private calculateLexicalSimilarity(queryKeywords: string[], entryKeywords: string[], tfidfVector: number[]): number {
    if (queryKeywords.length === 0 || entryKeywords.length === 0) return 0;
    
    // Calculate Jaccard similarity
    const querySet = new Set(queryKeywords);
    const entrySet = new Set(entryKeywords);
    const intersection = new Set([...querySet].filter(x => entrySet.has(x)));
    const union = new Set([...querySet, ...entrySet]);
    const jaccardSimilarity = intersection.size / union.size;
    
    // Calculate TF-IDF similarity if available
    let tfidfScore = 0;
    if (tfidfVector && tfidfVector.length > 0) {
      // Simple TF-IDF scoring based on keyword overlap
      for (const keyword of queryKeywords) {
        const keywordIndex = entryKeywords.indexOf(keyword);
        if (keywordIndex !== -1 && keywordIndex < tfidfVector.length) {
          tfidfScore += tfidfVector[keywordIndex];
        }
      }
      tfidfScore = Math.min(tfidfScore / queryKeywords.length, 1.0);
    }
    
    // Combine Jaccard and TF-IDF scores
    return (jaccardSimilarity * 0.7) + (tfidfScore * 0.3);
  }

  private calculateRecencyScore(lastAccessed: Date): number {
    const now = Date.now();
    const timeDiff = now - lastAccessed.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // Exponential decay over 30 days
    return Math.exp(-daysDiff / 30);
  }

  private calculatePopularityScore(accessCount: number): number {
    // Logarithmic scaling for popularity
    return Math.log(accessCount + 1) / Math.log(100);
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    });
  }

  private async rankResults(results: SearchResult[], query: SearchQuery): Promise<SearchResult[]> {
    // Apply additional ranking factors
    const rankedResults = results.map(result => {
      // Boost score based on query term frequency in content
      const queryTerms = query.text.toLowerCase().split(/\s+/);
      const contentLower = result.content.toLowerCase();
      const termFrequency = queryTerms.reduce((count, term) => {
        const matches = contentLower.match(new RegExp(term, 'g'));
        return count + (matches ? matches.length : 0);
      }, 0);
      
      // Apply term frequency boost
      const frequencyBoost = Math.min(termFrequency * 0.05, 0.3);
      result.finalScore += frequencyBoost;
      
      // Boost score based on metadata quality
      if (result.metadata.language || result.metadata.framework) {
        result.finalScore += 0.1;
      }
      
      return result;
    });
    
    // Sort by final score
    return rankedResults.sort((a, b) => b.finalScore - a.finalScore);
  }

  private async enrichResults(results: SearchResult[], query: SearchQuery): Promise<SearchResult[]> {
    for (const result of results) {
      // Generate snippets
      result.snippets = this.generateSnippets(result.content, query.text);
      
      // Generate highlights
      result.highlights = this.generateHighlights(result.content, query.text);
      
      // Find related results
      result.relatedResults = await this.findRelatedResults(result.id, result.content);
    }
    
    return results;
  }

  private generateSnippets(content: string, query: string): string[] {
    const snippets: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const hasQueryTerm = queryTerms.some(term => sentenceLower.includes(term));
      
      if (hasQueryTerm) {
        // Clean and truncate sentence
        let snippet = sentence.trim();
        if (snippet.length > 150) {
          snippet = snippet.substring(0, 150) + '...';
        }
        snippets.push(snippet);
        
        if (snippets.length >= 3) break;
      }
    }
    
    return snippets;
  }

  private generateHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    for (const term of queryTerms) {
      if (term.length < 3) continue; // Skip very short terms
      
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        highlights.push(...matches.slice(0, 3)); // Limit to 3 matches per term
      }
    }
    
    return [...new Set(highlights)].slice(0, 10); // Remove duplicates and limit
  }

  private async findRelatedResults(resultId: string, content: string): Promise<string[]> {
    try {
      const similarContent = await enhancedVectorDatabase.findSimilarContent(content, {
        excludeId: resultId,
        limit: 5
      });
      
      return similarContent.map(result => result.id);
    } catch (error) {
      console.error('Failed to find related results:', error);
      return [];
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has'
    ]);
    
    // Filter stop words and count frequency
    const wordCount = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }
    
    // Sort by frequency and return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Generate spelling corrections
    const corrections = await this.generateSpellingCorrections(query);
    suggestions.push(...corrections);
    
    // Generate query expansions
    const expansions = await this.generateQueryExpansions(query);
    suggestions.push(...expansions);
    
    // Generate related terms
    const relatedTerms = await this.generateRelatedTerms(query);
    suggestions.push(...relatedTerms);
    
    return [...new Set(suggestions)].slice(0, 10);
  }

  private async generateSpellingCorrections(query: string): Promise<string[]> {
    // Simple spelling correction using common misspellings
    const commonMisspellings: Record<string, string[]> = {
      'javascript': ['javscript', 'javasript', 'javascript'],
      'typescript': ['typesript', 'typescrit', 'typescript'],
      'react': ['reat', 'reac', 'react'],
      'function': ['funciton', 'functon', 'function'],
      'variable': ['varible', 'variabe', 'variable']
    };
    
    const corrections: string[] = [];
    const words = query.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      for (const [correct, misspellings] of Object.entries(commonMisspellings)) {
        if (misspellings.includes(word)) {
          corrections.push(query.replace(new RegExp(word, 'gi'), correct));
        }
      }
    }
    
    return corrections;
  }

  private async generateQueryExpansions(query: string): Promise<string[]> {
    const expansions: string[] = [];
    
    // Add common programming terms
    const programmingTerms = [
      'example', 'tutorial', 'documentation', 'code', 'implementation',
      'solution', 'bug', 'fix', 'error', 'issue'
    ];
    
    for (const term of programmingTerms) {
      if (!query.toLowerCase().includes(term)) {
        expansions.push(`${query} ${term}`);
      }
    }
    
    return expansions;
  }

  private async generateRelatedTerms(query: string): Promise<string[]> {
    // Simple related term generation
    const relatedTermsMap: Record<string, string[]> = {
      'javascript': ['typescript', 'nodejs', 'react', 'angular', 'vue'],
      'react': ['react native', 'redux', 'jsx', 'hooks', 'components'],
      'python': ['django', 'flask', 'numpy', 'pandas', 'machine learning'],
      'database': ['sql', 'mongodb', 'postgresql', 'mysql', 'redis'],
      'api': ['rest', 'graphql', 'endpoint', 'server', 'client']
    };
    
    const related: string[] = [];
    const words = query.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (relatedTermsMap[word]) {
        related.push(...relatedTermsMap[word]);
      }
    }
    
    return related;
  }

  private async getRelatedQueries(query: SearchQuery): Promise<string[]> {
    // Find similar queries from search history
    const similarQueries: string[] = [];
    
    for (const historyQuery of this.searchHistory) {
      if (historyQuery.text !== query.text) {
        const similarity = this.calculateQuerySimilarity(query.text, historyQuery.text);
        if (similarity > 0.5) {
          similarQueries.push(historyQuery.text);
        }
      }
    }
    
    return [...new Set(similarQueries)].slice(0, 5);
  }

  private calculateQuerySimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private addToSearchHistory(query: SearchQuery): void {
    this.searchHistory.unshift(query);
    
    // Limit history size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
    
    // Save to storage periodically
    if (this.searchHistory.length % 10 === 0) {
      this.saveSearchData();
    }
  }

  private cacheResults(cacheKey: string, results: SearchResult[]): void {
    // Remove oldest cache entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
    
    this.queryCache.set(cacheKey, results);
    
    // Save cache to storage periodically
    if (this.queryCache.size % 50 === 0) {
      this.saveSearchData();
    }
  }

  private async saveSearchData(): Promise<void> {
    try {
      const data: any = await StorageService.getVectorDatabaseData() || {};
      data.searchIndexes = Array.from(this.searchIndexes.entries());
      data.queryCache = Array.from(this.queryCache.entries());
      data.searchHistory = this.searchHistory;
      data.performanceMetrics = this.performanceMetrics;
      
      await StorageService.saveVectorDatabaseData(data);
    } catch (error) {
      console.error('Failed to save search data:', error);
    }
  }

  async createSearchIndex(id: string, name: string, type: 'semantic' | 'lexical' | 'hybrid'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const index: SearchIndex = {
      id,
      name,
      type,
      entries: [],
      lastUpdated: new Date(),
      stats: {
        totalEntries: 0,
        averageEmbeddingDimension: 512,
        totalKeywords: 0,
        lastOptimized: new Date(),
        compressionRatio: 1.0
      }
    };

    this.searchIndexes.set(id, index);
    await this.saveSearchData();
  }

  async addToIndex(indexId: string, entries: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    const index = this.searchIndexes.get(indexId);
    if (!index) {
      throw new Error(`Index ${indexId} not found`);
    }

    for (const entry of entries) {
      // Generate embedding
      const embeddingResult = await localEmbeddingGenerator.generateEmbedding(entry.content, {
        type: entry.metadata.type || 'text',
        language: entry.metadata.language,
        framework: entry.metadata.framework,
        useCache: true
      });

      // Extract keywords
      const keywords = this.extractKeywords(entry.content);

      // Generate TF-IDF vector
      const tfidfVector = this.generateTFIDFVector(keywords, entry.content);

      const indexEntry: SearchIndexEntry = {
        id: entry.id,
        content: entry.content,
        embedding: embeddingResult.embedding,
        metadata: {
          ...entry.metadata,
          timestamp: Date.now(),
          embeddingModel: embeddingResult.model,
          dimensions: embeddingResult.dimensions
        },
        keywords,
        tfidfVector,
        lastAccessed: new Date(),
        accessCount: 0,
        relevanceScore: 0.5
      };

      // Remove existing entry with same ID
      index.entries = index.entries.filter(e => e.id !== entry.id);
      index.entries.push(indexEntry);
    }

    index.lastUpdated = new Date();
    index.stats.totalEntries = index.entries.length;
    index.stats.totalKeywords = index.entries.reduce((sum, entry) => sum + entry.keywords.length, 0);

    await this.saveSearchData();
  }

  private generateTFIDFVector(keywords: string[], content: string): number[] {
    // Simple TF-IDF vector generation
    const vector = new Array(Math.min(keywords.length, 100)).fill(0);
    
    for (let i = 0; i < Math.min(keywords.length, 100); i++) {
      const keyword = keywords[i];
      const frequency = (content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      vector[i] = frequency;
    }
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  async getSearchStats(): Promise<{
    totalIndexes: number;
    totalEntries: number;
    cacheSize: number;
    averageQueryTime: number;
    cacheHitRate: number;
  }> {
    const totalIndexes = this.searchIndexes.size;
    const totalEntries = Array.from(this.searchIndexes.values()).reduce((sum, index) => sum + index.entries.length, 0);
    const cacheSize = this.queryCache.size;
    
    const recentPerformance = this.performanceMetrics.slice(-100);
    const averageQueryTime = recentPerformance.length > 0 
      ? recentPerformance.reduce((sum, p) => sum + p.queryTime, 0) / recentPerformance.length 
      : 0;
    
    const cacheHits = recentPerformance.filter(p => p.cacheHit).length;
    const cacheHitRate = recentPerformance.length > 0 ? cacheHits / recentPerformance.length : 0;

    return {
      totalIndexes,
      totalEntries,
      cacheSize,
      averageQueryTime,
      cacheHitRate
    };
  }

  async clearCache(): Promise<void> {
    this.queryCache.clear();
    await this.saveSearchData();
  }

  async clearHistory(): Promise<void> {
    this.searchHistory = [];
    await this.saveSearchData();
  }
}

export const semanticSearchEngine = new SemanticSearchEngine();