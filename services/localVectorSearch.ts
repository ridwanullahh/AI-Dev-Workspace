import AsyncStorage from '@react-native-async-storage/async-storage';
import * as tf from '@tensorflow/tfjs';

interface EmbeddingEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'code' | 'text' | 'conversation' | 'knowledge';
    projectId?: string;
    language?: string;
    path?: string;
    timestamp: number;
  };
  keywords: string[];
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: any;
  type: string;
}

interface SearchIndex {
  id: string;
  type: 'semantic' | 'keyword' | 'hybrid';
  entries: EmbeddingEntry[];
  lastUpdated: number;
}

class LocalVectorSearch {
  private indexes: Map<string, SearchIndex> = new Map();
  private isInitialized = false;
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Load existing indexes
      await this.loadIndexes();
      
      // Build vocabulary from existing data
      await this.buildVocabulary();
      
      this.isInitialized = true;
      console.log('Local vector search initialized');
    } catch (error) {
      console.error('Failed to initialize vector search:', error);
      throw error;
    }
  }

  private async loadIndexes(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('vector_indexes');
      if (stored) {
        const indexes = JSON.parse(stored);
        for (const index of indexes) {
          this.indexes.set(index.id, index);
        }
      }
    } catch (error) {
      console.error('Failed to load indexes:', error);
    }
  }

  private async saveIndexes(): Promise<void> {
    try {
      const indexes = Array.from(this.indexes.values());
      await AsyncStorage.setItem('vector_indexes', JSON.stringify(indexes));
    } catch (error) {
      console.error('Failed to save indexes:', error);
    }
  }

  private async buildVocabulary(): Promise<void> {
    this.vocabulary.clear();
    const allTexts: string[] = [];
    const wordCounts = new Map<string, number>();
    const documentCounts = new Map<string, number>();

    // Collect all text from indexes
    for (const index of this.indexes.values()) {
      for (const entry of index.entries) {
        const text = entry.content + ' ' + entry.keywords.join(' ');
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
      if (count >= 2 && word.length > 2) { // Minimum frequency and length
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

  private async createEmbedding(text: string, type: 'code' | 'text' = 'text'): Promise<number[]> {
    // Preprocess text based on type
    let processedText = text;
    if (type === 'code') {
      processedText = this.preprocessCode(text);
    }

    // Use TF-IDF + simple neural embedding approach
    const tokens = this.tokenize(processedText);
    const vocabSize = Math.max(this.vocabulary.size, 1000);
    const embedding = new Array(256).fill(0); // 256-dimensional embeddings

    // Create TF-IDF vector
    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    // Normalize term frequencies
    const maxFreq = Math.max(...Array.from(termFreq.values()));
    for (const [term, freq] of termFreq) {
      const tf = freq / maxFreq;
      const idf = this.idfScores.get(term) || 0;
      const tfidf = tf * idf;
      
      const vocabIndex = this.vocabulary.get(term);
      if (vocabIndex !== undefined) {
        const embeddingIndex = vocabIndex % 256;
        embedding[embeddingIndex] += tfidf;
      }
    }

    // Add semantic features using simple hash-based approach
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = tokens[i] + ' ' + tokens[i + 1];
      const hash = this.simpleHash(bigram) % 256;
      embedding[hash] += 0.5;
    }

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

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private extractKeywords(text: string): string[] {
    const tokens = this.tokenize(text);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below'
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

  async createIndex(id: string, type: 'semantic' | 'keyword' | 'hybrid' = 'hybrid'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.indexes.set(id, {
      id,
      type,
      entries: [],
      lastUpdated: Date.now()
    });

    await this.saveIndexes();
  }

  async addToIndex(indexId: string, entries: Array<{
    id: string;
    content: string;
    metadata: {
      type: 'code' | 'text' | 'conversation' | 'knowledge';
      projectId?: string;
      language?: string;
      path?: string;
    };
  }>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let index = this.indexes.get(indexId);
    if (!index) {
      await this.createIndex(indexId);
      index = this.indexes.get(indexId)!;
    }

    for (const entry of entries) {
      const embedding = await this.createEmbedding(
        entry.content,
        entry.metadata.type === 'code' ? 'code' : 'text'
      );

      const keywords = this.extractKeywords(entry.content);

      const embeddingEntry: EmbeddingEntry = {
        id: entry.id,
        content: entry.content,
        embedding,
        metadata: {
          ...entry.metadata,
          timestamp: Date.now()
        },
        keywords
      };

      // Remove existing entry with same ID
      index.entries = index.entries.filter(e => e.id !== entry.id);
      index.entries.push(embeddingEntry);
    }

    index.lastUpdated = Date.now();
    
    // Rebuild vocabulary if significant changes
    if (entries.length > 10) {
      await this.buildVocabulary();
    }

    await this.saveIndexes();
  }

  async search(query: string, options: {
    indexId?: string;
    type?: 'code' | 'text' | 'all';
    limit?: number;
    threshold?: number;
    projectId?: string;
  } = {}): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      indexId,
      type = 'all',
      limit = 10,
      threshold = 0.3,
      projectId
    } = options;

    const queryEmbedding = await this.createEmbedding(query, type === 'code' ? 'code' : 'text');
    const queryKeywords = this.extractKeywords(query);
    const results: SearchResult[] = [];

    const indexesToSearch = indexId ? 
      [this.indexes.get(indexId)].filter(Boolean) : 
      Array.from(this.indexes.values());

    for (const index of indexesToSearch) {
      for (const entry of index.entries) {
        // Filter by project and type
        if (projectId && entry.metadata.projectId !== projectId) continue;
        if (type !== 'all' && entry.metadata.type !== type) continue;

        // Calculate semantic similarity
        const semanticScore = this.cosineSimilarity(queryEmbedding, entry.embedding);
        
        // Calculate keyword similarity
        const keywordScore = this.calculateKeywordSimilarity(queryKeywords, entry.keywords);
        
        // Combine scores (weighted)
        const combinedScore = (semanticScore * 0.7) + (keywordScore * 0.3);
        
        if (combinedScore >= threshold) {
          results.push({
            id: entry.id,
            content: entry.content,
            score: combinedScore,
            metadata: entry.metadata,
            type: entry.metadata.type
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

  private calculateKeywordSimilarity(queryKeywords: string[], entryKeywords: string[]): number {
    if (queryKeywords.length === 0 || entryKeywords.length === 0) return 0;

    const querySet = new Set(queryKeywords);
    const entrySet = new Set(entryKeywords);
    
    const intersection = new Set([...querySet].filter(x => entrySet.has(x)));
    const union = new Set([...querySet, ...entrySet]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  async findSimilar(content: string, options: {
    excludeId?: string;
    limit?: number;
    indexId?: string;
    projectId?: string;
  } = {}): Promise<SearchResult[]> {
    const embedding = await this.createEmbedding(content);
    const results: SearchResult[] = [];

    const indexesToSearch = options.indexId ? 
      [this.indexes.get(options.indexId)].filter(Boolean) : 
      Array.from(this.indexes.values());

    for (const index of indexesToSearch) {
      for (const entry of index.entries) {
        if (entry.id === options.excludeId) continue;
        if (options.projectId && entry.metadata.projectId !== options.projectId) continue;

        const similarity = this.cosineSimilarity(embedding, entry.embedding);
        
        if (similarity > 0.5) {
          results.push({
            id: entry.id,
            content: entry.content,
            score: similarity,
            metadata: entry.metadata,
            type: entry.metadata.type
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  async removeFromIndex(indexId: string, entryId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (index) {
      index.entries = index.entries.filter(e => e.id !== entryId);
      index.lastUpdated = Date.now();
      await this.saveIndexes();
    }
  }

  async clearIndex(indexId: string): Promise<void> {
    const index = this.indexes.get(indexId);
    if (index) {
      index.entries = [];
      index.lastUpdated = Date.now();
      await this.saveIndexes();
    }
  }

  async batchProcess(items: Array<{
    id: string;
    content: string;
    metadata: any;
  }>, batchSize: number = 50): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch with delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (const item of batch) {
        const embedding = await this.createEmbedding(
          item.content,
          item.metadata.type === 'code' ? 'code' : 'text'
        );
        
        item.metadata.embedding = embedding;
      }
    }
  }

  getIndexStats(): Record<string, { entries: number; lastUpdated: number }> {
    const stats: Record<string, { entries: number; lastUpdated: number }> = {};
    
    for (const [id, index] of this.indexes) {
      stats[id] = {
        entries: index.entries.length,
        lastUpdated: index.lastUpdated
      };
    }
    
    return stats;
  }

  async getMemoryUsage(): Promise<{ totalEntries: number; vocabularySize: number; indexCount: number }> {
    let totalEntries = 0;
    for (const index of this.indexes.values()) {
      totalEntries += index.entries.length;
    }

    return {
      totalEntries,
      vocabularySize: this.vocabulary.size,
      indexCount: this.indexes.size
    };
  }
}

export const localVectorSearch = new LocalVectorSearch();