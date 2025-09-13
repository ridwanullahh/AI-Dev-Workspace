import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { localEmbeddingGenerator } from './localEmbeddingGenerator';
import { storageService } from './storage';
import { ContextMemory, KnowledgeNode } from './types';

interface SemanticMemoryConfig {
  maxMemorySize: number;
  retentionPeriod: number; // in days
  compressionThreshold: number;
  consolidationInterval: number; // in hours
  importanceThreshold: number;
  relevanceDecayRate: number;
}

interface MemoryConsolidation {
  id: string;
  memories: ContextMemory[];
  consolidatedMemory: ContextMemory;
  timestamp: Date;
  compressionRatio: number;
}

interface MemoryRetrieval {
  query: string;
  results: ContextMemory[];
  relevanceScores: number[];
  retrievalTime: number;
  strategy: 'semantic' | 'keyword' | 'hybrid' | 'temporal';
}

interface MemoryAnalytics {
  totalMemories: number;
  averageRelevance: number;
  memoryTypes: Record<string, number>;
  retentionRate: number;
  consolidationEvents: number;
  lastConsolidation: Date;
}

class SemanticMemoryArchitecture {
  private memoryConfig: SemanticMemoryConfig = {
    maxMemorySize: 10000,
    retentionPeriod: 90, // 90 days
    compressionThreshold: 5000,
    consolidationInterval: 24, // 24 hours
    importanceThreshold: 0.3,
    relevanceDecayRate: 0.01
  };

  private activeMemories: Map<string, ContextMemory> = new Map();
  private memoryIndex: Map<string, string[]> = new Map(); // type -> memory IDs
  private consolidationHistory: MemoryConsolidation[] = [];
  private retrievalHistory: MemoryRetrieval[] = [];
  private isInitialized = false;
  private lastConsolidation = new Date();

  async initialize(config?: Partial<SemanticMemoryConfig>): Promise<void> {
    try {
      console.log('Initializing Semantic Memory Architecture...');
      
      // Update configuration
      if (config) {
        this.memoryConfig = { ...this.memoryConfig, ...config };
      }

      // Load existing memories from storage
      await this.loadMemories();
      
      // Load memory index
      await this.loadMemoryIndex();
      
      // Load consolidation history
      await this.loadConsolidationHistory();
      
      // Initialize memory maintenance
      this.startMemoryMaintenance();
      
      this.isInitialized = true;
      console.log('Semantic Memory Architecture initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Semantic Memory Architecture:', error);
      throw error;
    }
  }

  private async loadMemories(): Promise<void> {
    try {
      const memories = await storageService.getSemanticMemory();
      for (const memory of memories) {
        this.activeMemories.set(memory.id, memory);
      }
      console.log(`Loaded ${memories.length} semantic memories`);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  }

  private async loadMemoryIndex(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData();
      if (data && data.memoryIndex) {
        this.memoryIndex = new Map(data.memoryIndex);
        console.log(`Loaded memory index with ${this.memoryIndex.size} types`);
      }
    } catch (error) {
      console.error('Failed to load memory index:', error);
    }
  }

  private async loadConsolidationHistory(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData();
      if (data && data.consolidationHistory) {
        this.consolidationHistory = data.consolidationHistory;
        console.log(`Loaded ${this.consolidationHistory.length} consolidation events`);
      }
    } catch (error) {
      console.error('Failed to load consolidation history:', error);
    }
  }

  private startMemoryMaintenance(): void {
    // Run consolidation every 24 hours
    setInterval(() => {
      this.performMemoryConsolidation();
    }, this.memoryConfig.consolidationInterval * 60 * 60 * 1000);

    // Run cleanup every hour
    setInterval(() => {
      this.performMemoryCleanup();
    }, 60 * 60 * 1000);
  }

  async storeMemory(
    content: string,
    type: 'code' | 'conversation' | 'decision' | 'pattern',
    metadata: Record<string, any> = {},
    projectId?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const memoryId = this.generateMemoryId(content, type);
    
    // Generate embedding for semantic search
    const embeddingResult = await localEmbeddingGenerator.generateEmbedding(content, {
      type: type === 'code' ? 'code' : 'text',
      useCache: true
    });

    // Calculate importance score
    const importanceScore = this.calculateImportanceScore(content, type, metadata);

    const memory: ContextMemory = {
      id: memoryId,
      content,
      type,
      timestamp: new Date(),
      relevanceScore: importanceScore,
      embedding: embeddingResult.embedding,
      metadata: {
        ...metadata,
        projectId,
        embeddingModel: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        processingTime: embeddingResult.processingTime,
        confidence: embeddingResult.confidence
      }
    };

    // Store in active memory
    this.activeMemories.set(memoryId, memory);
    
    // Update memory index
    if (!this.memoryIndex.has(type)) {
      this.memoryIndex.set(type, []);
    }
    this.memoryIndex.get(type)!.push(memoryId);

    // Store in persistent storage
    await storageService.saveSemanticMemory(memory);
    
    // Add to vector database for search
    await enhancedVectorDatabase.addToIndex(`semantic_memory_${projectId || 'global'}`, [{
      id: memoryId,
      content,
      metadata: {
        ...memory.metadata,
        type,
        memoryType: 'semantic'
      }
    }]);

    // Check if consolidation is needed
    if (this.activeMemories.size >= this.memoryConfig.compressionThreshold) {
      await this.performMemoryConsolidation();
    }

    return memoryId;
  }

  private generateMemoryId(content: string, type: string): string {
    const timestamp = Date.now();
    const contentHash = this.simpleHash(content);
    return `memory_${type}_${contentHash}_${timestamp}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private calculateImportanceScore(content: string, type: string, metadata: Record<string, any>): number {
    let score = 0.5; // Base score

    // Type-based importance
    const typeWeights = {
      'code': 0.8,
      'decision': 0.9,
      'pattern': 0.7,
      'conversation': 0.6
    };
    score += typeWeights[type] || 0.5;

    // Content length importance
    if (content.length > 1000) score += 0.1;
    if (content.length > 5000) score += 0.1;

    // Metadata importance
    if (metadata.priority === 'high') score += 0.2;
    if (metadata.priority === 'urgent') score += 0.3;
    if (metadata.isGenerated) score += 0.1;
    if (metadata.framework) score += 0.1;
    if (metadata.language) score += 0.1;

    // Recency boost
    const age = Date.now() - (metadata.timestamp || Date.now());
    const recencyBoost = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000)); // 7 days
    score += recencyBoost * 0.2;

    return Math.min(score, 1.0);
  }

  async retrieveMemories(
    query: string,
    options: {
      type?: 'code' | 'conversation' | 'decision' | 'pattern' | 'all';
      projectId?: string;
      limit?: number;
      threshold?: number;
      strategy?: 'semantic' | 'keyword' | 'hybrid' | 'temporal';
      timeRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{
    memories: ContextMemory[];
    relevanceScores: number[];
    retrievalTime: number;
    strategy: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    const {
      type = 'all',
      projectId,
      limit = 10,
      threshold = 0.3,
      strategy = 'hybrid',
      timeRange
    } = options;

    let candidateMemories = Array.from(this.activeMemories.values());

    // Filter by type
    if (type !== 'all') {
      const memoryIds = this.memoryIndex.get(type) || [];
      candidateMemories = candidateMemories.filter(memory => memoryIds.includes(memory.id));
    }

    // Filter by project
    if (projectId) {
      candidateMemories = candidateMemories.filter(memory => 
        memory.metadata.projectId === projectId
      );
    }

    // Filter by time range
    if (timeRange) {
      candidateMemories = candidateMemories.filter(memory => 
        memory.timestamp >= timeRange.start && memory.timestamp <= timeRange.end
      );
    }

    // Apply retrieval strategy
    let scoredMemories: { memory: ContextMemory; score: number }[] = [];

    switch (strategy) {
      case 'semantic':
        scoredMemories = await this.semanticRetrieval(query, candidateMemories);
        break;
      case 'keyword':
        scoredMemories = this.keywordRetrieval(query, candidateMemories);
        break;
      case 'temporal':
        scoredMemories = this.temporalRetrieval(query, candidateMemories);
        break;
      case 'hybrid':
      default:
        scoredMemories = await this.hybridRetrieval(query, candidateMemories);
        break;
    }

    // Filter by threshold and sort
    const filteredMemories = scoredMemories
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const memories = filteredMemories.map(item => item.memory);
    const relevanceScores = filteredMemories.map(item => item.score);
    const retrievalTime = Date.now() - startTime;

    // Record retrieval history
    this.retrievalHistory.push({
      query,
      results: memories,
      relevanceScores,
      retrievalTime,
      strategy
    });

    // Update memory access patterns
    for (const memory of memories) {
      memory.relevanceScore = Math.min(memory.relevanceScore + 0.01, 1.0);
      this.activeMemories.set(memory.id, memory);
    }

    return {
      memories,
      relevanceScores,
      retrievalTime,
      strategy
    };
  }

  private async semanticRetrieval(query: string, memories: ContextMemory[]): Promise<{ memory: ContextMemory; score: number }[]> {
    const queryEmbedding = await localEmbeddingGenerator.generateEmbedding(query, {
      useCache: true
    });

    return memories.map(memory => ({
      memory,
      score: this.cosineSimilarity(queryEmbedding.embedding, memory.embedding)
    }));
  }

  private keywordRetrieval(query: string, memories: ContextMemory[]): { memory: ContextMemory; score: number }[] {
    const queryKeywords = this.extractKeywords(query);
    
    return memories.map(memory => {
      const memoryKeywords = this.extractKeywords(memory.content);
      const score = this.calculateKeywordSimilarity(queryKeywords, memoryKeywords);
      return { memory, score };
    });
  }

  private temporalRetrieval(query: string, memories: ContextMemory[]): { memory: ContextMemory; score: number }[] {
    const now = Date.now();
    
    return memories.map(memory => {
      const age = now - memory.timestamp.getTime();
      const ageInDays = age / (24 * 60 * 60 * 1000);
      
      // Exponential decay favoring recent memories
      const temporalScore = Math.exp(-ageInDays / 30); // 30-day half-life
      
      // Combine with basic keyword matching
      const queryKeywords = this.extractKeywords(query);
      const memoryKeywords = this.extractKeywords(memory.content);
      const keywordScore = this.calculateKeywordSimilarity(queryKeywords, memoryKeywords);
      
      const finalScore = (temporalScore * 0.7) + (keywordScore * 0.3);
      
      return { memory, score: finalScore };
    });
  }

  private async hybridRetrieval(query: string, memories: ContextMemory[]): Promise<{ memory: ContextMemory; score: number }[]> {
    const semanticResults = await this.semanticRetrieval(query, memories);
    const keywordResults = this.keywordRetrieval(query, memories);
    const temporalResults = this.temporalRetrieval(query, memories);

    return memories.map((memory, index) => {
      const semanticScore = semanticResults.find(r => r.memory.id === memory.id)?.score || 0;
      const keywordScore = keywordResults.find(r => r.memory.id === memory.id)?.score || 0;
      const temporalScore = temporalResults.find(r => r.memory.id === memory.id)?.score || 0;

      // Weighted combination
      const finalScore = 
        (semanticScore * 0.5) + 
        (keywordScore * 0.3) + 
        (temporalScore * 0.2);

      return { memory, score: finalScore };
    });
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

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has'
    ]);
    
    return words
      .filter(word => !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, 20);
  }

  private calculateKeywordSimilarity(queryKeywords: string[], memoryKeywords: string[]): number {
    if (queryKeywords.length === 0 || memoryKeywords.length === 0) return 0;

    const querySet = new Set(queryKeywords);
    const memorySet = new Set(memoryKeywords);
    const intersection = new Set([...querySet].filter(x => memorySet.has(x)));
    const union = new Set([...querySet, ...memorySet]);

    return intersection.size / union.size; // Jaccard similarity
  }

  async findRelatedMemories(memoryId: string, options: {
    limit?: number;
    threshold?: number;
  } = {}): Promise<ContextMemory[]> {
    const { limit = 5, threshold = 0.5 } = options;
    
    const targetMemory = this.activeMemories.get(memoryId);
    if (!targetMemory) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const relatedMemories: ContextMemory[] = [];
    
    for (const memory of this.activeMemories.values()) {
      if (memory.id === memoryId) continue;
      
      const similarity = this.cosineSimilarity(targetMemory.embedding, memory.embedding);
      
      if (similarity >= threshold) {
        relatedMemories.push(memory);
      }
    }

    return relatedMemories
      .sort((a, b) => {
        const similarityA = this.cosineSimilarity(targetMemory.embedding, a.embedding);
        const similarityB = this.cosineSimilarity(targetMemory.embedding, b.embedding);
        return similarityB - similarityA;
      })
      .slice(0, limit);
  }

  async performMemoryConsolidation(): Promise<void> {
    if (this.activeMemories.size < this.memoryConfig.compressionThreshold) return;

    console.log('Performing memory consolidation...');
    
    const consolidationStartTime = Date.now();
    
    // Group memories by type and project
    const memoryGroups = this.groupMemoriesForConsolidation();
    
    for (const [groupKey, memories] of memoryGroups) {
      if (memories.length < 5) continue; // Only consolidate groups with sufficient memories
      
      const consolidatedMemory = await this.consolidateMemoryGroup(memories);
      
      if (consolidatedMemory) {
        const consolidation: MemoryConsolidation = {
          id: `consolidation_${Date.now()}_${groupKey}`,
          memories,
          consolidatedMemory,
          timestamp: new Date(),
          compressionRatio: memories.length / 1
        };
        
        this.consolidationHistory.push(consolidation);
        
        // Remove original memories and add consolidated one
        for (const memory of memories) {
          this.activeMemories.delete(memory.id);
          await storageService.deleteSemanticMemory(memory.id);
        }
        
        this.activeMemories.set(consolidatedMemory.id, consolidatedMemory);
        await storageService.saveSemanticMemory(consolidatedMemory);
      }
    }
    
    this.lastConsolidation = new Date();
    
    // Update memory index
    await this.updateMemoryIndex();
    
    // Save consolidation history
    await this.saveConsolidationHistory();
    
    console.log(`Memory consolidation completed in ${Date.now() - consolidationStartTime}ms`);
  }

  private groupMemoriesForConsolidation(): Map<string, ContextMemory[]> {
    const groups = new Map<string, ContextMemory[]>();
    
    for (const memory of this.activeMemories.values()) {
      // Group by type and project
      const groupKey = `${memory.type}_${memory.metadata.projectId || 'global'}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push(memory);
    }
    
    return groups;
  }

  private async consolidateMemoryGroup(memories: ContextMemory[]): Promise<ContextMemory | null> {
    if (memories.length === 0) return null;
    
    // Sort by relevance score
    memories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Take top memories for consolidation
    const topMemories = memories.slice(0, Math.min(memories.length, 10));
    
    // Generate consolidated content
    const consolidatedContent = this.generateConsolidatedContent(topMemories);
    
    // Generate consolidated embedding
    const embeddingResult = await localEmbeddingGenerator.generateEmbedding(consolidatedContent, {
      type: topMemories[0].type,
      useCache: true
    });
    
    // Calculate consolidated importance score
    const importanceScore = topMemories.reduce((sum, memory) => sum + memory.relevanceScore, 0) / topMemories.length;
    
    const consolidatedMemory: ContextMemory = {
      id: this.generateMemoryId(consolidatedContent, `consolidated_${topMemories[0].type}`),
      content: consolidatedContent,
      type: topMemories[0].type,
      timestamp: new Date(),
      relevanceScore: importanceScore,
      embedding: embeddingResult.embedding,
      metadata: {
        ...topMemories[0].metadata,
        consolidatedFrom: topMemories.map(m => m.id),
        consolidationCount: topMemories.length,
        embeddingModel: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        isConsolidated: true
      }
    };
    
    return consolidatedMemory;
  }

  private generateConsolidatedContent(memories: ContextMemory[]): string {
    // Simple content consolidation - in production, this would use more sophisticated NLP
    const contentParts = memories.map(memory => {
      const preview = memory.content.length > 200 
        ? memory.content.substring(0, 200) + '...' 
        : memory.content;
      return `[${memory.type.toUpperCase()}] ${preview}`;
    });
    
    return `Consolidated memory from ${memories.length} items:\n\n${contentParts.join('\n\n')}`;
  }

  private async updateMemoryIndex(): Promise<void> {
    this.memoryIndex.clear();
    
    for (const memory of this.activeMemories.values()) {
      if (!this.memoryIndex.has(memory.type)) {
        this.memoryIndex.set(memory.type, []);
      }
      this.memoryIndex.get(memory.type)!.push(memory.id);
    }
    
    // Save updated index
    const data = await storageService.getVectorDatabaseData() || {};
    data.memoryIndex = Array.from(this.memoryIndex.entries());
    await storageService.saveVectorDatabaseData(data);
  }

  private async saveConsolidationHistory(): Promise<void> {
    const data = await storageService.getVectorDatabaseData() || {};
    data.consolidationHistory = this.consolidationHistory;
    await storageService.saveVectorDatabaseData(data);
  }

  async performMemoryCleanup(): Promise<void> {
    const now = Date.now();
    const retentionPeriod = this.memoryConfig.retentionPeriod * 24 * 60 * 60 * 1000;
    
    const memoriesToRemove: string[] = [];
    
    for (const memory of this.activeMemories.values()) {
      const age = now - memory.timestamp.getTime();
      
      // Remove old memories
      if (age > retentionPeriod) {
        memoriesToRemove.push(memory.id);
        continue;
      }
      
      // Apply relevance decay
      const decayAmount = this.memoryConfig.relevanceDecayRate * (age / (24 * 60 * 60 * 1000));
      memory.relevanceScore = Math.max(0, memory.relevanceScore - decayAmount);
      
      // Remove memories with low relevance
      if (memory.relevanceScore < this.memoryConfig.importanceThreshold) {
        memoriesToRemove.push(memory.id);
      }
    }
    
    // Remove memories from active storage and persistent storage
    for (const memoryId of memoriesToRemove) {
      this.activeMemories.delete(memoryId);
      await storageService.deleteSemanticMemory(memoryId);
    }
    
    // Update memory index
    await this.updateMemoryIndex();
    
    if (memoriesToRemove.length > 0) {
      console.log(`Cleaned up ${memoriesToRemove.length} memories`);
    }
  }

  async getMemoryAnalytics(): Promise<MemoryAnalytics> {
    const totalMemories = this.activeMemories.size;
    const averageRelevance = totalMemories > 0 
      ? Array.from(this.activeMemories.values()).reduce((sum, memory) => sum + memory.relevanceScore, 0) / totalMemories 
      : 0;
    
    const memoryTypes: Record<string, number> = {};
    for (const memory of this.activeMemories.values()) {
      memoryTypes[memory.type] = (memoryTypes[memory.type] || 0) + 1;
    }
    
    const retentionRate = totalMemories > 0 
      ? (totalMemories - this.consolidationHistory.reduce((sum, consolidation) => sum + consolidation.memories.length, 0)) / totalMemories 
      : 1;
    
    return {
      totalMemories,
      averageRelevance,
      memoryTypes,
      retentionRate,
      consolidationEvents: this.consolidationHistory.length,
      lastConsolidation: this.lastConsolidation
    };
  }

  async exportMemories(projectId?: string): Promise<ContextMemory[]> {
    let memories = Array.from(this.activeMemories.values());
    
    if (projectId) {
      memories = memories.filter(memory => memory.metadata.projectId === projectId);
    }
    
    return memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async importMemories(memories: ContextMemory[]): Promise<void> {
    for (const memory of memories) {
      this.activeMemories.set(memory.id, memory);
      await storageService.saveSemanticMemory(memory);
      
      // Update memory index
      if (!this.memoryIndex.has(memory.type)) {
        this.memoryIndex.set(memory.type, []);
      }
      this.memoryIndex.get(memory.type)!.push(memory.id);
    }
    
    await this.updateMemoryIndex();
  }

  async clearAllMemories(): Promise<void> {
    this.activeMemories.clear();
    this.memoryIndex.clear();
    this.consolidationHistory = [];
    this.retrievalHistory = [];
    
    await storageService.clearSemanticMemory();
    await this.updateMemoryIndex();
    await this.saveConsolidationHistory();
  }

  updateConfig(config: Partial<SemanticMemoryConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config };
  }

  getConfig(): SemanticMemoryConfig {
    return { ...this.memoryConfig };
  }
}

export const semanticMemoryArchitecture = new SemanticMemoryArchitecture();