import * as tf from '@tensorflow/tfjs';
import { VectorSearchResult, EmbeddingModel, SearchIndex, IndexEntry } from './types';

class EmbeddingService {
  private model: tf.LayersModel | null = null;
  private isLoaded = false;
  private vocabulary: Map<string, number> = new Map();
  private indexes: Map<string, SearchIndex> = new Map();

  async initialize(): Promise<void> {
    try {
      // Load Universal Sentence Encoder Lite (smaller model for mobile)
      await tf.ready();
      
      // For now, we'll use a simple text embedding approach
      // In production, you would load the actual USE model
      this.isLoaded = true;
      console.log('Embedding service initialized');
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw error;
    }
  }

  // Simple text embedding using TF-IDF approach (lightweight for mobile)
  private async createSimpleEmbedding(text: string): Promise<number[]> {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const embedding = new Array(256).fill(0);
    
    // Simple hash-based embedding for demonstration
    for (const word of words) {
      const hash = this.simpleHash(word) % 256;
      embedding[hash] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async generateEmbedding(text: string, type: 'code' | 'text' = 'text'): Promise<number[]> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    // Preprocess based on type
    let processedText = text;
    if (type === 'code') {
      // Extract meaningful parts from code
      processedText = this.preprocessCode(text);
    }

    return await this.createSimpleEmbedding(processedText);
  }

  private preprocessCode(code: string): string {
    // Extract function names, variable names, comments, and keywords
    const patterns = [
      /function\s+(\w+)/g,
      /const\s+(\w+)/g,
      /let\s+(\w+)/g,
      /var\s+(\w+)/g,
      /class\s+(\w+)/g,
      /interface\s+(\w+)/g,
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

    return extracted.join(' ') + ' ' + code.replace(/[{}();,]/g, ' ');
  }

  // Vector search functionality
  async search(query: string, options: {
    type?: 'code' | 'text' | 'all';
    limit?: number;
    threshold?: number;
    projectId?: string;
  } = {}): Promise<VectorSearchResult[]> {
    const {
      type = 'all',
      limit = 10,
      threshold = 0.3,
      projectId
    } = options;

    const queryEmbedding = await this.generateEmbedding(query, type === 'code' ? 'code' : 'text');
    const results: VectorSearchResult[] = [];

    // Search through all indexes
    for (const [indexId, index] of this.indexes) {
      if (projectId && !indexId.includes(projectId)) continue;
      if (type !== 'all' && !indexId.includes(type)) continue;

      for (const entry of index.entries) {
        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
        
        if (similarity >= threshold) {
          results.push({
            id: entry.id,
            content: entry.content,
            score: similarity,
            metadata: entry.metadata,
            type: entry.metadata.type || 'text'
          });
        }
      }
    }

    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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

  // Index management
  async createIndex(id: string, type: 'semantic' | 'keyword' | 'hybrid'): Promise<void> {
    this.indexes.set(id, {
      id,
      type,
      entries: [],
      lastUpdated: new Date()
    });
  }

  async addToIndex(indexId: string, entries: {
    id: string;
    content: string;
    metadata: Record<string, any>;
  }[]): Promise<void> {
    const index = this.indexes.get(indexId);
    if (!index) {
      await this.createIndex(indexId, 'hybrid');
    }

    const updatedIndex = this.indexes.get(indexId)!;

    for (const entry of entries) {
      const embedding = await this.generateEmbedding(
        entry.content,
        entry.metadata.type === 'code' ? 'code' : 'text'
      );

      const keywords = this.extractKeywords(entry.content);

      const indexEntry: IndexEntry = {
        id: entry.id,
        content: entry.content,
        embedding,
        metadata: entry.metadata,
        keywords
      };

      // Remove existing entry with same ID
      updatedIndex.entries = updatedIndex.entries.filter(e => e.id !== entry.id);
      updatedIndex.entries.push(indexEntry);
    }

    updatedIndex.lastUpdated = new Date();
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 20); // Limit keywords
  }

  async removeFromIndex(indexId: string, entryId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (index) {
      index.entries = index.entries.filter(e => e.id !== entryId);
      index.lastUpdated = new Date();
    }
  }

  async clearIndex(indexId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (index) {
      index.entries = [];
      index.lastUpdated = new Date();
    }
  }

  // Semantic similarity for content recommendation
  async findSimilarContent(content: string, options: {
    excludeId?: string;
    limit?: number;
    projectId?: string;
  } = {}): Promise<VectorSearchResult[]> {
    const embedding = await this.generateEmbedding(content);
    const results: VectorSearchResult[] = [];

    for (const [indexId, index] of this.indexes) {
      if (options.projectId && !indexId.includes(options.projectId)) continue;

      for (const entry of index.entries) {
        if (entry.id === options.excludeId) continue;

        const similarity = this.cosineSimilarity(embedding, entry.embedding);
        
        if (similarity > 0.5) { // Higher threshold for similarity
          results.push({
            id: entry.id,
            content: entry.content,
            score: similarity,
            metadata: entry.metadata,
            type: entry.metadata.type || 'text'
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  // Batch processing for large datasets
  async batchProcess(items: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
  }>, batchSize: number = 50): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch with delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (const item of batch) {
        const embedding = await this.generateEmbedding(
          item.content,
          item.metadata.type === 'code' ? 'code' : 'text'
        );
        
        // Store embedding for later use
        item.metadata.embedding = embedding;
      }
    }
  }

  getIndexStats(): Record<string, { entries: number, lastUpdated: Date }> {
    const stats: Record<string, { entries: number, lastUpdated: Date }> = {};
    
    for (const [id, index] of this.indexes) {
      stats[id] = {
        entries: index.entries.length,
        lastUpdated: index.lastUpdated
      };
    }
    
    return stats;
  }
}

export const embeddingService = new EmbeddingService();