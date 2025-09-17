import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { localEmbeddingGenerator } from './localEmbeddingGenerator';
import { semanticMemoryArchitecture } from './semanticMemory';
import { knowledgeGraphSystem } from './knowledgeGraph';
import { StorageService } from './StorageService';
import { ChatMessage, AIContext } from './types';

interface ContextConfig {
  maxContextSize: number;
  maxTokenLimit: number;
  relevanceThreshold: number;
  temporalWeight: number;
  semanticWeight: number;
  priorityWeight: number;
  compressionRatio: number;
  updateInterval: number;
}

interface ContextWindow {
  id: string;
  projectId: string;
  sessionId: string;
  messages: ContextMessage[];
  memories: ContextMemory[];
  knowledgeNodes: KnowledgeNode[];
  metadata: ContextMetadata;
  lastUpdated: Date;
  size: number;
  tokenCount: number;
}

interface ContextMessage extends ChatMessage {
  relevanceScore: number;
  priority: number;
  embedding: number[];
  compressed?: boolean;
}

interface ContextMemory {
  id: string;
  content: string;
  type: 'code' | 'conversation' | 'decision' | 'pattern';
  relevanceScore: number;
  timestamp: Date;
  embedding: number[];
  metadata: Record<string, any>;
}

interface KnowledgeNode {
  id: string;
  content: string;
  type: 'file' | 'function' | 'concept' | 'pattern' | 'edge' | 'cluster';
  relevanceScore: number;
  embedding: number[];
  connections: string[];
  metadata: Record<string, any>;
}

interface ContextMetadata {
  projectName: string;
  projectType: string;
  currentTask?: string;
  activeAgents: string[];
  contextPriority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  lastActivity: Date;
}

interface ContextUpdate {
  type: 'add' | 'remove' | 'update' | 'compress';
  itemId: string;
  itemType: 'message' | 'memory' | 'knowledge';
  data: any;
  timestamp: Date;
}

interface ContextAnalytics {
  totalWindows: number;
  averageSize: number;
  averageTokenCount: number;
  compressionRatio: number;
  relevanceDistribution: { low: number; medium: number; high: number };
  updateFrequency: number;
  memoryUsage: number;
}

class ContextManagementSystem {
  private contextWindows: Map<string, ContextWindow> = new Map();
  private contextConfig: ContextConfig = {
    maxContextSize: 10000,
    maxTokenLimit: 4000,
    relevanceThreshold: 0.3,
    temporalWeight: 0.2,
    semanticWeight: 0.5,
    priorityWeight: 0.3,
    compressionRatio: 0.7,
    updateInterval: 30000 // 30 seconds
  };
  private updateHistory: ContextUpdate[] = [];
  private isInitialized = false;
  private lastCleanup = new Date();

  async initialize(config?: Partial<ContextConfig>): Promise<void> {
    try {
      console.log('Initializing Context Management System...');
      
      // Update configuration
      if (config) {
        this.contextConfig = { ...this.contextConfig, ...config };
      }

      // Load existing context windows
      await this.loadContextWindows();
      
      // Start context maintenance
      this.startContextMaintenance();
      
      this.isInitialized = true;
      console.log('Context Management System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Context Management System:', error);
      throw error;
    }
  }

  private async loadContextWindows(): Promise<void> {
    try {
      const contexts = await StorageService.getAllAIContexts();
      for (const context of contexts) {
        const messages = await StorageService.getAllChatMessages();
        const memories = await StorageService.getAllContextMemories();
        const knowledge = await StorageService.getAllKnowledgeNodes();

        const contextWindow: ContextWindow = {
          ...(context as any),
          messages: messages.filter(m => m.projectId === context.projectId) as any[],
          memories: memories.filter(m => m.projectId === context.projectId) as any[],
          knowledgeNodes: knowledge.filter(k => k.projectId === context.projectId) as any[],
        };
        this.contextWindows.set(context.projectId, contextWindow);
      }
      console.log(`Loaded ${this.contextWindows.size} context windows`);
    } catch (error) {
      console.error('Failed to load context windows:', error);
    }
  }

  private startContextMaintenance(): void {
    // Run context updates periodically
    setInterval(() => {
      this.updateAllContexts();
    }, this.contextConfig.updateInterval);

    // Run cleanup periodically
    setInterval(() => {
      this.performContextCleanup();
    }, this.contextConfig.updateInterval * 10);
  }

  async createContextWindow(
    projectId: string,
    sessionId: string,
    metadata: Partial<ContextMetadata> = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const contextId = this.generateContextId(projectId, sessionId);
    
    const contextWindow: ContextWindow = {
      id: contextId,
      projectId,
      sessionId,
      messages: [],
      memories: [],
      knowledgeNodes: [],
      metadata: {
        projectName: metadata.projectName || 'Untitled Project',
        projectType: metadata.projectType || 'web',
        activeAgents: metadata.activeAgents || [],
        contextPriority: metadata.contextPriority || 'medium',
        tags: metadata.tags || [],
        lastActivity: new Date(),
        ...metadata
      },
      lastUpdated: new Date(),
      size: 0,
      tokenCount: 0
    };

    this.contextWindows.set(contextId, contextWindow);
    await this.saveContextWindows();

    return contextId;
  }

  private generateContextId(projectId: string, sessionId: string): string {
    return `context_${projectId}_${sessionId}_${Date.now()}`;
  }

  async addMessage(
    contextId: string,
    message: ChatMessage,
    options: {
      priority?: number;
      compress?: boolean;
    } = {}
  ): Promise<void> {
    const contextWindow = this.contextWindows.get(contextId);
    if (!contextWindow) {
      throw new Error(`Context window ${contextId} not found`);
    }

    const { priority = 0.5, compress = false } = options;

    // Generate embedding for semantic search
    const embeddingResult = await localEmbeddingGenerator.generateEmbedding(message.content, {
      useCache: true
    });

    const contextMessage: ContextMessage = {
      ...message,
      relevanceScore: this.calculateMessageRelevance(message, contextWindow),
      priority,
      embedding: embeddingResult.embedding,
      compressed: compress
    };

    // Add message to context
    contextWindow.messages.push(contextMessage);
    
    // Record update
    this.recordUpdate({
      type: 'add',
      itemId: message.id,
      itemType: 'message',
      data: contextMessage,
      timestamp: new Date()
    });

    // Update context metrics
    await this.updateContextMetrics(contextWindow);

    // Compress context if needed
    if (contextWindow.size >= this.contextConfig.maxContextSize * 0.8) {
      await this.compressContext(contextWindow);
    }

    // Save context
    await this.saveContextWindows();
  }

  private calculateMessageRelevance(message: ChatMessage, contextWindow: ContextWindow): number {
    let relevance = 0.5; // Base relevance

    // Temporal relevance (more recent = more relevant)
    const age = Date.now() - message.timestamp.getTime();
    const temporalScore = Math.exp(-age / (24 * 60 * 60 * 1000)); // 24-day half-life
    relevance += temporalScore * this.contextConfig.temporalWeight;

    // Role-based relevance
    const roleWeights = {
      'user': 0.8,
      'assistant': 0.7,
      'system': 0.9
    };
    relevance += (roleWeights[message.role] || 0.5) * 0.2;

    // Content length relevance
    if (message.content.length > 100) relevance += 0.1;
    if (message.content.length > 500) relevance += 0.1;

    // Metadata relevance

    return Math.min(relevance, 1.0);
  }

  async addMemory(
    contextId: string,
    memoryId: string,
    options: {
      relevanceBoost?: number;
    } = {}
  ): Promise<void> {
    const contextWindow = this.contextWindows.get(contextId);
    if (!contextWindow) {
      throw new Error(`Context window ${contextId} not found`);
    }

    const { relevanceBoost = 0 } = options;

    // Retrieve memory from semantic memory
    const memoryResult = await semanticMemoryArchitecture.retrieveMemories(
      '',
      { type: 'all', limit: 1 }
    );

    const memory = memoryResult.memories.find(m => m.id === memoryId);
    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const contextMemory: ContextMemory = {
      id: memory.id,
      content: memory.content,
      type: memory.type,
      relevanceScore: Math.min(memory.relevanceScore + relevanceBoost, 1.0),
      timestamp: memory.timestamp,
      embedding: memory.embedding,
      metadata: memory.metadata
    };

    // Add memory to context
    contextWindow.memories.push(contextMemory);
    
    // Record update
    this.recordUpdate({
      type: 'add',
      itemId: memoryId,
      itemType: 'memory',
      data: contextMemory,
      timestamp: new Date()
    });

    // Update context metrics
    await this.updateContextMetrics(contextWindow);

    // Save context
    await this.saveContextWindows();
  }

  async addKnowledge(
    contextId: string,
    knowledgeNodeId: string,
    options: {
      relevanceBoost?: number;
    } = {}
  ): Promise<void> {
    const contextWindow = this.contextWindows.get(contextId);
    if (!contextWindow) {
      throw new Error(`Context window ${contextId} not found`);
    }

    const { relevanceBoost = 0 } = options;

    // Get knowledge node from knowledge graph
    const knowledgeNode = knowledgeGraphSystem['nodes'].get(knowledgeNodeId);
    if (!knowledgeNode) {
      throw new Error(`Knowledge node ${knowledgeNodeId} not found`);
    }

    const contextKnowledgeNode: KnowledgeNode = {
      id: knowledgeNode.id,
      content: knowledgeNode.content,
      type: knowledgeNode.type,
      relevanceScore: Math.min(knowledgeNode.relevanceScore + relevanceBoost, 1.0),
      embedding: knowledgeNode.embedding,
      connections: knowledgeNode.connections,
      metadata: knowledgeNode.metadata
    };

    // Add knowledge node to context
    contextWindow.knowledgeNodes.push(contextKnowledgeNode);
    
    // Record update
    this.recordUpdate({
      type: 'add',
      itemId: knowledgeNodeId,
      itemType: 'knowledge',
      data: contextKnowledgeNode,
      timestamp: new Date()
    });

    // Update context metrics
    await this.updateContextMetrics(contextWindow);

    // Save context
    await this.saveContextWindows();
  }

  async getContextWindow(contextId: string): Promise<ContextWindow | null> {
    return this.contextWindows.get(contextId) || null;
  }

  async getOptimizedContext(
    contextId: string,
    options: {
      maxTokens?: number;
      query?: string;
      includeTypes?: ('messages' | 'memories' | 'knowledge')[];
      minRelevance?: number;
    } = {}
  ): Promise<{
    messages: ContextMessage[];
    memories: ContextMemory[];
    knowledgeNodes: KnowledgeNode[];
    totalTokens: number;
    relevanceScore: number;
  }> {
    const contextWindow = this.contextWindows.get(contextId);
    if (!contextWindow) {
      throw new Error(`Context window ${contextId} not found`);
    }

    const {
      maxTokens = this.contextConfig.maxTokenLimit,
      query,
      includeTypes = ['messages', 'memories', 'knowledge'],
      minRelevance = this.contextConfig.relevanceThreshold
    } = options;

    let optimizedMessages: ContextMessage[] = [];
    let optimizedMemories: ContextMemory[] = [];
    let optimizedKnowledgeNodes: KnowledgeNode[] = [];
    let totalTokens = 0;

    // Generate query embedding if provided
    let queryEmbedding: number[] | null = null;
    if (query) {
      const embeddingResult = await localEmbeddingGenerator.generateEmbedding(query, {
        useCache: true
      });
      queryEmbedding = embeddingResult.embedding;
    }

    // Optimize messages
    if (includeTypes.includes('messages')) {
      optimizedMessages = await this.optimizeContextItems(
        contextWindow.messages,
        queryEmbedding,
        maxTokens - totalTokens,
        minRelevance
      );
      totalTokens += this.estimateTokens(optimizedMessages);
    }

    // Optimize memories
    if (includeTypes.includes('memories') && totalTokens < maxTokens) {
      optimizedMemories = await this.optimizeContextItems(
        contextWindow.memories,
        queryEmbedding,
        maxTokens - totalTokens,
        minRelevance
      );
      totalTokens += this.estimateTokens(optimizedMemories);
    }

    // Optimize knowledge nodes
    if (includeTypes.includes('knowledge') && totalTokens < maxTokens) {
      optimizedKnowledgeNodes = await this.optimizeContextItems(
        contextWindow.knowledgeNodes,
        queryEmbedding,
        maxTokens - totalTokens,
        minRelevance
      );
      totalTokens += this.estimateTokens(optimizedKnowledgeNodes);
    }

    // Calculate overall relevance score
    const allItems = [...optimizedMessages, ...optimizedMemories, ...optimizedKnowledgeNodes];
    const overallRelevance = allItems.length > 0 
      ? allItems.reduce((sum, item) => sum + item.relevanceScore, 0) / allItems.length 
      : 0;

    return {
      messages: optimizedMessages,
      memories: optimizedMemories,
      knowledgeNodes: optimizedKnowledgeNodes,
      totalTokens,
      relevanceScore: overallRelevance
    };
  }

  private async optimizeContextItems<T extends ContextMessage | ContextMemory | KnowledgeNode>(
    items: T[],
    queryEmbedding: number[] | null,
    maxTokens: number,
    minRelevance: number
  ): Promise<T[]> {
    // Score items based on relevance
    const scoredItems = items.map(item => {
      let score = item.relevanceScore;

      // Add semantic similarity if query is provided
      if (queryEmbedding) {
        const semanticSimilarity = this.cosineSimilarity(queryEmbedding, item.embedding);
        score += semanticSimilarity * this.contextConfig.semanticWeight;
      }

      // Add priority weight
      if ('priority' in item) {
        score += item.priority * this.contextConfig.priorityWeight;
      }

      return { item, score };
    });

    // Filter by minimum relevance and sort by score
    const filteredItems = scoredItems
      .filter(({ score }) => score >= minRelevance)
      .sort((a, b) => b.score - a.score);

    // Select items within token limit
    const optimizedItems: T[] = [];
    let currentTokens = 0;

    for (const { item } of filteredItems) {
      const itemTokens = this.estimateTokens([item]);
      
      if (currentTokens + itemTokens <= maxTokens) {
        optimizedItems.push(item);
        currentTokens += itemTokens;
      } else {
        break;
      }
    }

    return optimizedItems;
  }

  private estimateTokens(items: any[]): number {
    // Simple token estimation (rough approximation)
    let totalChars = 0;
    
    for (const item of items) {
      if (typeof item.content === 'string') {
        totalChars += item.content.length;
      }
      if (typeof item === 'string') {
        totalChars += item.length;
      }
    }

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
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

  private async updateContextMetrics(contextWindow: ContextWindow): Promise<void> {
    // Calculate total size
    contextWindow.size = this.calculateContextSize(contextWindow);
    
    // Calculate token count
    contextWindow.tokenCount = this.estimateTokens([
      ...contextWindow.messages,
      ...contextWindow.memories,
      ...contextWindow.knowledgeNodes
    ]);

    // Update last activity
    contextWindow.metadata.lastActivity = new Date();
    contextWindow.lastUpdated = new Date();
  }

  private calculateContextSize(contextWindow: ContextWindow): number {
    let size = 0;
    
    // Messages size
    for (const message of contextWindow.messages) {
      size += JSON.stringify(message).length;
    }
    
    // Memories size
    for (const memory of contextWindow.memories) {
      size += JSON.stringify(memory).length;
    }
    
    // Knowledge nodes size
    for (const node of contextWindow.knowledgeNodes) {
      size += JSON.stringify(node).length;
    }
    
    // Metadata size
    size += JSON.stringify(contextWindow.metadata).length;
    
    return size;
  }

  private async compressContext(contextWindow: ContextWindow): Promise<void> {
    console.log(`Compressing context window ${contextWindow.id}...`);
    
    const compressionRatio = this.contextConfig.compressionRatio;
    
    // Compress messages
    contextWindow.messages = await this.compressItems(
      contextWindow.messages,
      compressionRatio
    );
    
    // Compress memories
    contextWindow.memories = await this.compressItems(
      contextWindow.memories,
      compressionRatio
    );
    
    // Compress knowledge nodes
    contextWindow.knowledgeNodes = await this.compressItems(
      contextWindow.knowledgeNodes,
      compressionRatio
    );
    
    // Update metrics
    await this.updateContextMetrics(contextWindow);
    
    // Record update
    this.recordUpdate({
      type: 'compress',
      itemId: contextWindow.id,
      itemType: 'message',
      data: { compressionRatio },
      timestamp: new Date()
    });
    
    console.log(`Context window compressed to ${contextWindow.size} bytes`);
  }

  private async compressItems<T extends ContextMessage | ContextMemory | KnowledgeNode>(
    items: T[],
    compressionRatio: number
  ): Promise<T[]> {
    if (items.length === 0) return items;
    
    // Sort by relevance score
    items.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Keep top items based on compression ratio
    const keepCount = Math.max(Math.floor(items.length * compressionRatio), 1);
    return items.slice(0, keepCount);
  }

  private async updateAllContexts(): Promise<void> {
    console.log('Updating all context windows...');
    
    for (const contextWindow of this.contextWindows.values()) {
      // Update relevance scores
      await this.updateRelevanceScores(contextWindow);
      
      // Check if compression is needed
      if (contextWindow.size >= this.contextConfig.maxContextSize * 0.8) {
        await this.compressContext(contextWindow);
      }
    }
    
    // Save all contexts
    await this.saveContextWindows();
    
    console.log('All context windows updated');
  }

  private async updateRelevanceScores(contextWindow: ContextWindow): Promise<void> {
    const now = Date.now();
    
    // Update message relevance
    for (const message of contextWindow.messages) {
      const age = now - message.timestamp.getTime();
      const temporalDecay = Math.exp(-age / (24 * 60 * 60 * 1000));
      message.relevanceScore = Math.max(0.1, message.relevanceScore * temporalDecay);
    }
    
    // Update memory relevance
    for (const memory of contextWindow.memories) {
      const age = now - memory.timestamp.getTime();
      const temporalDecay = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // 7-day half-life for memories
      memory.relevanceScore = Math.max(0.1, memory.relevanceScore * temporalDecay);
    }
    
    // Update knowledge node relevance
    for (const node of contextWindow.knowledgeNodes) {
      // Knowledge nodes maintain relevance longer
      const age = now - new Date(node.metadata.createdAt || 0).getTime();
      const temporalDecay = Math.exp(-age / (30 * 24 * 60 * 60 * 1000)); // 30-day half-life
      node.relevanceScore = Math.max(0.1, node.relevanceScore * temporalDecay);
    }
  }

  private async performContextCleanup(): Promise<void> {
    console.log('Performing context cleanup...');
    
    const contextsToRemove: string[] = [];
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [contextId, contextWindow] of this.contextWindows) {
      const age = now - contextWindow.metadata.lastActivity.getTime();
      
      // Remove inactive contexts
      if (age > maxAge) {
        contextsToRemove.push(contextId);
      }
    }
    
    // Remove old contexts
    for (const contextId of contextsToRemove) {
      this.contextWindows.delete(contextId);
    }
    
    if (contextsToRemove.length > 0) {
      await this.saveContextWindows();
      console.log(`Cleaned up ${contextsToRemove.length} inactive context windows`);
    }
    
    this.lastCleanup = new Date();
  }

  private recordUpdate(update: ContextUpdate): void {
    this.updateHistory.push(update);
    
    // Limit history size
    if (this.updateHistory.length > 1000) {
      this.updateHistory = this.updateHistory.slice(-1000);
    }
  }

  private async saveContextWindows(): Promise<void> {
    try {
      for (const contextWindow of this.contextWindows.values()) {
        const { messages, memories, knowledgeNodes, ...contextData } = contextWindow;
        
        if (await StorageService.getAIContext(contextWindow.projectId)) {
          await StorageService.updateAIContext(contextWindow.projectId, contextData as any);
        } else {
          await StorageService.addAIContext(contextData as any);
        }

        for (const message of messages) {
          if (await StorageService.getChatMessage(message.id)) {
            await StorageService.updateChatMessage(message.id, message as any);
          } else {
            await StorageService.addChatMessage({ ...message, projectId: contextWindow.projectId } as any);
          }
        }
        
        for (const memory of memories) {
            if (await StorageService.getContextMemory(memory.id)) {
                await StorageService.updateContextMemory(memory.id, memory as any);
            } else {
                await StorageService.addContextMemory({ ...memory, projectId: contextWindow.projectId } as any);
            }
        }

        for (const node of knowledgeNodes) {
            if (await StorageService.getKnowledgeNode(node.id)) {
                await StorageService.updateKnowledgeNode(node.id, node as any);
            } else {
                await StorageService.addKnowledgeNode({ ...node, projectId: contextWindow.projectId } as any);
            }
        }
      }
    } catch (error) {
      console.error('Failed to save context windows:', error);
    }
  }

  async getContextAnalytics(): Promise<ContextAnalytics> {
    const totalWindows = this.contextWindows.size;
    
    let totalSize = 0;
    let totalTokens = 0;
    let relevanceDistribution = { low: 0, medium: 0, high: 0 };
    
    for (const contextWindow of this.contextWindows.values()) {
      totalSize += contextWindow.size;
      totalTokens += contextWindow.tokenCount;
      
      // Calculate relevance distribution
      const allItems = [
        ...contextWindow.messages,
        ...contextWindow.memories,
        ...contextWindow.knowledgeNodes
      ];
      
      for (const item of allItems) {
        if (item.relevanceScore < 0.3) {
          relevanceDistribution.low++;
        } else if (item.relevanceScore < 0.7) {
          relevanceDistribution.medium++;
        } else {
          relevanceDistribution.high++;
        }
      }
    }
    
    const averageSize = totalWindows > 0 ? totalSize / totalWindows : 0;
    const averageTokenCount = totalWindows > 0 ? totalTokens / totalWindows : 0;
    
    // Calculate compression ratio
    const compressionRatio = averageSize > 0 
      ? (this.contextConfig.maxContextSize - averageSize) / this.contextConfig.maxContextSize 
      : 0;
    
    // Calculate update frequency
    const recentUpdates = this.updateHistory.filter(
      update => Date.now() - update.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    ).length;
    
    // Estimate memory usage
    const memoryUsage = totalSize + (this.updateHistory.length * 1000); // Rough estimate
    
    return {
      totalWindows,
      averageSize,
      averageTokenCount,
      compressionRatio,
      relevanceDistribution,
      updateFrequency: recentUpdates,
      memoryUsage
    };
  }

  async exportContext(contextId: string): Promise<ContextWindow | null> {
    const contextWindow = this.contextWindows.get(contextId);
    if (!contextWindow) return null;
    
    // Return a deep copy
    return JSON.parse(JSON.stringify(contextWindow));
  }

  async importContext(contextWindow: ContextWindow): Promise<void> {
    this.contextWindows.set(contextWindow.id, contextWindow);
    await this.saveContextWindows();
  }

  async clearAllContexts(): Promise<void> {
    this.contextWindows.clear();
    this.updateHistory = [];
    await this.saveContextWindows();
  }

  updateConfig(config: Partial<ContextConfig>): void {
    this.contextConfig = { ...this.contextConfig, ...config };
  }

  getConfig(): ContextConfig {
    return { ...this.contextConfig };
  }
}

export const contextManagementSystem = new ContextManagementSystem();