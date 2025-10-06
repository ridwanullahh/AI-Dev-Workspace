import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { VectorSearchResult, EmbeddingModel, SearchIndex, IndexEntry } from './types';
import { storageService } from './storage';

interface EnhancedIndexEntry extends IndexEntry {
  hierarchicalCluster?: number;
  localNeighbors: string[];
  importanceScore: number;
  accessCount: number;
  lastAccessed: Date;
  compressionLevel: number;
}

interface HierarchicalCluster {
  id: number;
  centroid: number[];
  members: string[];
  radius: number;
  level: number;
  parent?: number;
  children: number[];
}

interface MemoryStats {
  totalEntries: number;
  totalMemory: number;
  compressionRatio: number;
  averageAccessTime: number;
  cacheHitRate: number;
  clusterCount: number;
}

class EnhancedVectorDatabase {
  private model: use.UniversalSentenceEncoder | null = null;
  private isInitialized = false;
  private indexes: Map<string, SearchIndex> = new Map();
  private hierarchicalClusters: Map<number, HierarchicalCluster> = new Map();
  private lruCache: Map<string, EnhancedIndexEntry> = new Map();
  private accessStats: Map<string, { count: number; lastAccessed: Date }> = new Map();
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private maxCacheSize = 1000;
  private compressionThreshold = 500;
  private nextClusterId = 0;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Enhanced Vector Database...');
      
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Load Universal Sentence Encoder
      this.model = await use.load();
      
      // Load existing data from storage
      await this.loadPersistentData();
      
      // Build vocabulary and IDF scores
      await this.buildVocabulary();
      
      // Initialize hierarchical clustering
      await this.initializeHierarchicalClustering();
      
      this.isInitialized = true;
      console.log('Enhanced Vector Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Vector Database:', error);
      throw error;
    }
  }

  private async loadPersistentData(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData();
      if (data) {
        // Load indexes
        if (data.indexes) {
          this.indexes = new Map(data.indexes);
        }
        
        // Load hierarchical clusters
        if (data.clusters) {
          this.hierarchicalClusters = new Map(data.clusters);
        }
        
        // Load access stats
        if (data.accessStats) {
          this.accessStats = new Map(data.accessStats);
        }
        
        console.log(`Loaded ${this.indexes.size} indexes and ${this.hierarchicalClusters.size} clusters`);
      }
    } catch (error) {
      console.error('Failed to load persistent data:', error);
    }
  }

  private async savePersistentData(): Promise<void> {
    try {
      const data = {
        indexes: Array.from(this.indexes.entries()),
        clusters: Array.from(this.hierarchicalClusters.entries()),
        accessStats: Array.from(this.accessStats.entries()),
        timestamp: Date.now()
      };
      
      await storageService.saveVectorDatabaseData(data);
    } catch (error) {
      console.error('Failed to save persistent data:', error);
    }
  }

  private async buildVocabulary(): Promise<void> {
    this.vocabulary.clear();
    this.idfScores.clear();
    
    const allTexts: string[] = [];
    const documentCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();

    // Collect all text from indexes
    for (const index of this.indexes.values()) {
      for (const entry of index.entries) {
        const text = entry.content + ' ' + (entry.keywords || []).join(' ');
        allTexts.push(text);
        
        const words = this.tokenize(text);
        const uniqueWords = new Set(words);
        
        // Count word occurrences
        for (const word of words) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
        
        // Count document occurrences
        for (const word of uniqueWords) {
          documentCounts.set(word, (documentCounts.get(word) || 0) + 1);
        }
      }
    }

    // Build vocabulary with frequency filtering
    let vocabIndex = 0;
    for (const [word, count] of wordCounts) {
      if (count >= 2 && word.length > 2) {
        this.vocabulary.set(word, vocabIndex++);
        
        // Calculate IDF score
        const idf = Math.log(allTexts.length / (documentCounts.get(word) || 1));
        this.idfScores.set(word, idf);
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private async initializeHierarchicalClustering(): Promise<void> {
    // Create hierarchical clusters for existing data
    for (const [indexId, index] of this.indexes) {
      if (index.entries.length > 10) {
        await this.createHierarchicalClusters(indexId, index.entries);
      }
    }
  }

  private async createHierarchicalClusters(indexId: string, entries: EnhancedIndexEntry[]): Promise<void> {
    if (entries.length < 10) return;

    // Level 1: Create initial clusters using k-means
    const k = Math.min(Math.ceil(Math.sqrt(entries.length)), 10);
    const clusters = await this.kMeansClustering(entries, k);
    
    // Level 2: Create hierarchical structure
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const clusterId = this.nextClusterId++;
      
      const hierarchicalCluster: HierarchicalCluster = {
        id: clusterId,
        centroid: cluster.centroid,
        members: cluster.members.map(m => m.id),
        radius: cluster.radius,
        level: 1,
        children: []
      };
      
      this.hierarchicalClusters.set(clusterId, hierarchicalCluster);
      
      // Assign cluster ID to entries
      for (const member of cluster.members) {
        member.hierarchicalCluster = clusterId;
      }
      
      // Create sub-clusters if cluster is large
      if (cluster.members.length > 20) {
        await this.createSubClusters(clusterId, cluster.members);
      }
    }
  }

  private async kMeansClustering(entries: EnhancedIndexEntry[], k: number): Promise<{
    centroid: number[];
    members: EnhancedIndexEntry[];
    radius: number;
  }[]> {
    if (entries.length === 0) return [];
    
    const dimension = entries[0].embedding.length;
    
    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      centroids.push([...randomEntry.embedding]);
    }
    
    let iterations = 0;
    const maxIterations = 100;
    let converged = false;
    
    while (!converged && iterations < maxIterations) {
      // Assign entries to nearest centroid
      const clusters: EnhancedIndexEntry[][] = Array(k).fill(null).map(() => []);
      
      for (const entry of entries) {
        let nearestCentroid = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.euclideanDistance(entry.embedding, centroids[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroid = i;
          }
        }
        
        clusters[nearestCentroid].push(entry);
      }
      
      // Update centroids
      const newCentroids: number[][] = [];
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          const newCentroid = new Array(dimension).fill(0);
          for (const entry of clusters[i]) {
            for (let j = 0; j < dimension; j++) {
              newCentroid[j] += entry.embedding[j];
            }
          }
          for (let j = 0; j < dimension; j++) {
            newCentroid[j] /= clusters[i].length;
          }
          newCentroids.push(newCentroid);
        } else {
          newCentroids.push([...centroids[i]]);
        }
      }
      
      // Check convergence
      converged = true;
      for (let i = 0; i < k; i++) {
        const distance = this.euclideanDistance(centroids[i], newCentroids[i]);
        if (distance > 0.01) {
          converged = false;
          break;
        }
      }
      
      centroids.splice(0, centroids.length, ...newCentroids);
      iterations++;
    }
    
    // Calculate cluster radii and return results
    return clusters.map((cluster, i) => ({
      centroid: centroids[i],
      members: cluster,
      radius: this.calculateClusterRadius(cluster, centroids[i])
    }));
  }

  private async createSubClusters(parentId: number, entries: EnhancedIndexEntry[]): Promise<void> {
    const k = Math.min(Math.ceil(Math.sqrt(entries.length)), 5);
    const subClusters = await this.kMeansClustering(entries, k);
    
    for (let i = 0; i < subClusters.length; i++) {
      const cluster = subClusters[i];
      const clusterId = this.nextClusterId++;
      
      const hierarchicalCluster: HierarchicalCluster = {
        id: clusterId,
        centroid: cluster.centroid,
        members: cluster.members.map(m => m.id),
        radius: cluster.radius,
        level: 2,
        parent: parentId,
        children: []
      };
      
      this.hierarchicalClusters.set(clusterId, hierarchicalCluster);
      
      // Update parent cluster
      const parent = this.hierarchicalClusters.get(parentId);
      if (parent) {
        parent.children.push(clusterId);
      }
      
      // Assign cluster ID to entries
      for (const member of cluster.members) {
        member.hierarchicalCluster = clusterId;
      }
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  private calculateClusterRadius(entries: EnhancedIndexEntry[], centroid: number[]): number {
    if (entries.length === 0) return 0;
    
    let maxDistance = 0;
    for (const entry of entries) {
      const distance = this.euclideanDistance(entry.embedding, centroid);
      maxDistance = Math.max(maxDistance, distance);
    }
    
    return maxDistance;
  }

  async generateEmbedding(text: string, type: 'code' | 'text' = 'text'): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model) {
      throw new Error('Universal Sentence Encoder model not loaded');
    }

    // Preprocess text based on type
    let processedText = text;
    if (type === 'code') {
      processedText = this.preprocessCode(text);
    }

    // Generate embedding using Universal Sentence Encoder
    const embeddings = await this.model.embed([processedText]);
    const embedding = Array.from(await embeddings.data());
    
    // Normalize embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  private preprocessCode(code: string): string {
    // Extract meaningful parts from code
    const patterns = [
      /function\s+(\w+)/g,
      /const\s+(\w+)/g,
      /let\s+(\w+)/g,
      /var\s+(\w+)/g,
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
      /type\s+(\w+)/g,
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /\/\*\*?(.*?)\*\//gs,
      /\/\/(.*?)$/gm
    ];

    let extracted = [];
    for (const pattern of patterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        extracted.push(match[1] || match[0]);
      }
    }

    // Add code structure information
    const structureInfo = this.extractCodeStructure(code);
    extracted.push(...structureInfo);

    return extracted.join(' ') + ' ' + code.replace(/[{}();,]/g, ' ');
  }

  private extractCodeStructure(code: string): string[] {
    const structure = [];
    
    // Detect programming language patterns
    if (code.includes('import ') || code.includes('require(')) {
      structure.push('module-system');
    }
    if (code.includes('class ') || code.includes('function ')) {
      structure.push('object-oriented');
    }
    if (code.includes('async ') || code.includes('await ')) {
      structure.push('asynchronous');
    }
    if (code.includes('React') || code.includes('Component')) {
      structure.push('react-component');
    }
    if (code.includes('useState') || code.includes('useEffect')) {
      structure.push('react-hooks');
    }
    if (code.includes('SELECT ') || code.includes('INSERT ')) {
      structure.push('database-sql');
    }
    if (code.includes('app.get') || code.includes('app.post')) {
      structure.push('express-api');
    }
    
    return structure;
  }

  async search(query: string, options: {
    type?: 'code' | 'text' | 'all';
    limit?: number;
    threshold?: number;
    projectId?: string;
    useHierarchical?: boolean;
    useCache?: boolean;
  } = {}): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      type = 'all',
      limit = 10,
      threshold = 0.3,
      projectId,
      useHierarchical = true,
      useCache = true
    } = options;

    // Check cache first
    const cacheKey = `${query}_${type}_${projectId || 'all'}`;
    if (useCache && this.lruCache.has(cacheKey)) {
      const cachedResult = this.lruCache.get(cacheKey)!;
      this.updateAccessStats(cacheKey);
      return this.convertToVectorSearchResult([cachedResult]);
    }

    const queryEmbedding = await this.generateEmbedding(query, type === 'code' ? 'code' : 'text');
    const results: EnhancedIndexEntry[] = [];

    if (useHierarchical) {
      // Use hierarchical clustering for faster search
      const candidateEntries = await this.hierarchicalSearch(queryEmbedding, projectId, type);
      results.push(...candidateEntries);
    } else {
      // Fallback to linear search
      for (const [indexId, index] of this.indexes) {
        if (projectId && !indexId.includes(projectId)) continue;
        if (type !== 'all' && !indexId.includes(type)) continue;

        for (const entry of index.entries as EnhancedIndexEntry[]) {
          const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
          
          if (similarity >= threshold) {
            results.push({
              ...entry,
              importanceScore: this.calculateImportanceScore(entry, similarity)
            });
          }
        }
      }
    }

    // Sort by importance score and limit results
    const sortedResults = results
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, limit);

    // Update cache
    if (sortedResults.length > 0) {
      this.updateLRUCache(cacheKey, sortedResults[0]);
    }

    return this.convertToVectorSearchResult(sortedResults);
  }

  private async hierarchicalSearch(queryEmbedding: number[], projectId?: string, type?: string): Promise<EnhancedIndexEntry[]> {
    const candidates: EnhancedIndexEntry[] = [];

    // Find relevant clusters
    for (const cluster of this.hierarchicalClusters.values()) {
      const clusterDistance = this.euclideanDistance(queryEmbedding, cluster.centroid);
      
      if (clusterDistance <= cluster.radius * 2) {
        // This cluster is relevant, get its entries
        for (const [indexId, index] of this.indexes) {
          if (projectId && !indexId.includes(projectId)) continue;
          if (type !== 'all' && !indexId.includes(type)) continue;

          for (const entry of index.entries as EnhancedIndexEntry[]) {
            if (entry.hierarchicalCluster === cluster.id) {
              const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
              if (similarity >= 0.3) {
                candidates.push({
                  ...entry,
                  importanceScore: this.calculateImportanceScore(entry, similarity)
                });
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  private calculateImportanceScore(entry: EnhancedIndexEntry, similarity: number): number {
    let score = similarity;
    
    // Boost score based on access frequency
    const accessStat = this.accessStats.get(entry.id);
    if (accessStat) {
      score += Math.log(accessStat.count + 1) * 0.1;
    }
    
    // Boost score based on recency
    const timeDiff = Date.now() - entry.lastAccessed.getTime();
    const recencyBoost = Math.max(0, 1 - timeDiff / (30 * 24 * 60 * 60 * 1000)); // 30 days
    score += recencyBoost * 0.2;
    
    // Boost score based on entry importance
    score += entry.importanceScore * 0.3;
    
    return Math.min(score, 1.0);
  }

  private updateAccessStats(entryId: string): void {
    const stat = this.accessStats.get(entryId) || { count: 0, lastAccessed: new Date() };
    stat.count++;
    stat.lastAccessed = new Date();
    this.accessStats.set(entryId, stat);
  }

  private updateLRUCache(key: string, entry: EnhancedIndexEntry): void {
    if (this.lruCache.size >= this.maxCacheSize) {
      // Remove least recently used entry
      const lruKey = this.lruCache.keys().next().value;
      this.lruCache.delete(lruKey);
    }
    
    this.lruCache.set(key, entry);
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

  private convertToVectorSearchResult(entries: EnhancedIndexEntry[]): VectorSearchResult[] {
    return entries.map(entry => ({
      id: entry.id,
      content: entry.content,
      score: entry.importanceScore,
      metadata: entry.metadata,
      type: entry.metadata.type || 'text'
    }));
  }

  async createIndex(id: string, type: 'semantic' | 'keyword' | 'hybrid' = 'hybrid'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.indexes.set(id, {
      id,
      type,
      entries: [],
      lastUpdated: new Date()
    });

    await this.savePersistentData();
  }

  async addToIndex(indexId: string, entries: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let index = this.indexes.get(indexId);
    if (!index) {
      await this.createIndex(indexId);
      index = this.indexes.get(indexId)!;
    }

    const enhancedEntries: EnhancedIndexEntry[] = [];

    for (const entry of entries) {
      const embedding = await this.generateEmbedding(
        entry.content,
        entry.metadata.type === 'code' ? 'code' : 'text'
      );

      const keywords = this.extractKeywords(entry.content);
      const importanceScore = this.calculateEntryImportance(entry.content, entry.metadata);

      const enhancedEntry: EnhancedIndexEntry = {
        id: entry.id,
        content: entry.content,
        embedding,
        metadata: {
          ...entry.metadata,
          timestamp: Date.now()
        },
        keywords,
        importanceScore,
        accessCount: 0,
        lastAccessed: new Date(),
        compressionLevel: 0,
        localNeighbors: []
      };

      enhancedEntries.push(enhancedEntry);
    }

    // Remove existing entries with same IDs
    index.entries = index.entries.filter(e => !enhancedEntries.some(ne => ne.id === e.id));
    index.entries.push(...enhancedEntries);
    index.lastUpdated = new Date();

    // Update hierarchical clustering if needed
    if (enhancedEntries.length > 10) {
      await this.updateHierarchicalClustering(indexId);
    }

    // Apply compression if needed
    if (index.entries.length > this.compressionThreshold) {
      await this.compressIndex(indexId);
    }

    await this.savePersistentData();
  }

  private calculateEntryImportance(content: string, metadata: Record<string, any>): number {
    let importance = 0.5; // Base importance

    // Boost importance based on content length
    if (content.length > 1000) importance += 0.1;
    if (content.length > 5000) importance += 0.1;

    // Boost importance based on metadata
    if (metadata.type === 'code') importance += 0.2;
    if (metadata.isGenerated) importance += 0.1;
    if (metadata.priority === 'high') importance += 0.2;
    if (metadata.priority === 'urgent') importance += 0.3;

    // Boost importance based on language
    if (metadata.language === 'typescript' || metadata.language === 'javascript') {
      importance += 0.1;
    }

    return Math.min(importance, 1.0);
  }

  private extractKeywords(text: string): string[] {
    const tokens = this.tokenize(text);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    // Filter and rank keywords by frequency and IDF score
    const keywordScores = new Map<string, number>();
    for (const token of tokens) {
      if (!stopWords.has(token) && token.length > 2) {
        const idf = this.idfScores.get(token) || 1;
        keywordScores.set(token, (keywordScores.get(token) || 0) + idf);
      }
    }
    
    return Array.from(keywordScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private async updateHierarchicalClustering(indexId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (!index || index.entries.length < 10) return;

    // Remove existing clusters for this index
    const clustersToRemove = Array.from(this.hierarchicalClusters.values())
      .filter(cluster => 
        cluster.members.some(memberId => 
          index.entries.some(entry => entry.id === memberId)
        )
      )
      .map(cluster => cluster.id);

    for (const clusterId of clustersToRemove) {
      this.hierarchicalClusters.delete(clusterId);
    }

    // Recreate clusters
    await this.createHierarchicalClusters(indexId, index.entries as EnhancedIndexEntry[]);
  }

  private async compressIndex(indexId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (!index) return;

    // Implement compression strategy
    const entries = index.entries as EnhancedIndexEntry[];
    
    // Sort by access frequency and recency
    entries.sort((a, b) => {
      const aStat = this.accessStats.get(a.id) || { count: 0, lastAccessed: new Date(0) };
      const bStat = this.accessStats.get(b.id) || { count: 0, lastAccessed: new Date(0) };
      
      if (aStat.count !== bStat.count) {
        return bStat.count - aStat.count;
      }
      return bStat.lastAccessed.getTime() - aStat.lastAccessed.getTime();
    });

    // Keep top 80% of entries, compress the rest
    const keepCount = Math.floor(entries.length * 0.8);
    const toCompress = entries.slice(keepCount);

    for (const entry of toCompress) {
      entry.compressionLevel = 1;
      // Further compression could be implemented here
    }

    index.lastUpdated = new Date();
  }

  async getMemoryStats(): Promise<MemoryStats> {
    let totalEntries = 0;
    let totalMemory = 0;
    let totalAccessTime = 0;
    let accessCount = 0;

    for (const index of this.indexes.values()) {
      totalEntries += index.entries.length;
      
      for (const entry of index.entries as EnhancedIndexEntry[]) {
        // Estimate memory usage
        totalMemory += entry.content.length * 2; // UTF-16 encoding
        totalMemory += entry.embedding.length * 8; // Float64
        totalMemory += JSON.stringify(entry.metadata).length * 2;
        
        const stat = this.accessStats.get(entry.id);
        if (stat) {
          totalAccessTime += stat.lastAccessed.getTime();
          accessCount += stat.count;
        }
      }
    }

    const cacheHits = Array.from(this.accessStats.values()).filter(stat => stat.count > 1).length;
    const cacheHitRate = this.accessStats.size > 0 ? cacheHits / this.accessStats.size : 0;

    return {
      totalEntries,
      totalMemory,
      compressionRatio: totalEntries > 0 ? totalMemory / (totalEntries * 1000) : 0,
      averageAccessTime: accessCount > 0 ? totalAccessTime / accessCount : 0,
      cacheHitRate,
      clusterCount: this.hierarchicalClusters.size
    };
  }

  async findSimilarContent(content: string, options: {
    excludeId?: string;
    limit?: number;
    projectId?: string;
  } = {}): Promise<VectorSearchResult[]> {
    const embedding = await this.generateEmbedding(content);
    const results: EnhancedIndexEntry[] = [];

    for (const [indexId, index] of this.indexes) {
      if (options.projectId && !indexId.includes(options.projectId)) continue;

      for (const entry of index.entries as EnhancedIndexEntry[]) {
        if (entry.id === options.excludeId) continue;

        const similarity = this.cosineSimilarity(embedding, entry.embedding);
        
        if (similarity > 0.5) {
          results.push({
            ...entry,
            importanceScore: this.calculateImportanceScore(entry, similarity)
          });
        }
      }
    }

    const sortedResults = results
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, options.limit || 10);

    return this.convertToVectorSearchResult(sortedResults);
  }

  async clearAllData(): Promise<void> {
    this.indexes.clear();
    this.hierarchicalClusters.clear();
    this.lruCache.clear();
    this.accessStats.clear();
    this.vocabulary.clear();
    this.idfScores.clear();
    this.nextClusterId = 0;

    await this.savePersistentData();
  }
}

export const enhancedVectorDatabase = new EnhancedVectorDatabase();