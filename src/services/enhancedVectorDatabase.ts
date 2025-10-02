import * as use from '@tensorflow-models/universal-sentence-encoder';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import { db } from '../database/schema';
import type { Vector, Memory } from '../database/schema';

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

export class EnhancedVectorDatabase {
  private model: use.UniversalSentenceEncoder | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        this.model = await use.load();
        this.isInitialized = true;
        console.log('✅ Vector database initialized');
      } catch (error) {
        console.error('❌ Failed to initialize vector database:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async embed(text: string | string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }

    if (!this.model) throw new Error('Model not loaded');

    const embeddings = await this.model.embed(Array.isArray(text) ? text : [text]);
    const embeddingsArray = await embeddings.array();
    embeddings.dispose();

    return embeddingsArray;
  }

  async addVector(
    namespace: string,
    content: string,
    metadata: Record<string, any> = {},
    ttl?: Date
  ): Promise<string> {
    const embeddings = await this.embed(content);
    const embedding = embeddings[0];

    const vector: Vector = {
      id: `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      namespace,
      content,
      embedding,
      metadata,
      ttl,
      createdAt: new Date()
    };

    await db.vectors.add(vector);
    return vector.id;
  }

  async addMemory(
    projectId: string,
    type: Memory['type'],
    content: string,
    importance: number = 0.5,
    tags: string[] = [],
    references: string[] = []
  ): Promise<string> {
    const embeddings = await this.embed(content);
    const embedding = embeddings[0];

    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      type,
      content,
      embedding,
      importance,
      tags,
      references,
      isPinned: false,
      createdAt: new Date(),
      accessedAt: new Date()
    };

    await db.memories.add(memory);
    return memory.id;
  }

  async searchSimilar(
    query: string,
    filter: { namespace?: string; projectId?: string } = {},
    limit: number = 10
  ): Promise<SearchResult[]> {
    const queryEmbeddings = await this.embed(query);
    const queryEmbedding = queryEmbeddings[0];

    let items: Array<{ id: string; content: string; embedding: number[]; metadata: Record<string, any> }> = [];

    if (filter.projectId) {
      const memories = await db.memories.where('projectId').equals(filter.projectId).toArray();
      items = memories.filter(m => m.embedding).map(m => ({
        id: m.id,
        content: m.content,
        embedding: m.embedding!,
        metadata: { type: m.type, importance: m.importance, tags: m.tags }
      }));
    } else if (filter.namespace) {
      const vectors = await db.vectors.where('namespace').equals(filter.namespace).toArray();
      items = vectors.map(v => ({
        id: v.id,
        content: v.content,
        embedding: v.embedding,
        metadata: v.metadata
      }));
    } else {
      const vectors = await db.vectors.toArray();
      items = vectors.map(v => ({
        id: v.id,
        content: v.content,
        embedding: v.embedding,
        metadata: v.metadata
      }));
    }

    const results: SearchResult[] = items.map(item => ({
      id: item.id,
      content: item.content,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  async getMemoriesByImportance(projectId: string, threshold: number = 0.5, limit: number = 20): Promise<Memory[]> {
    return await db.memories
      .where('projectId').equals(projectId)
      .and(m => m.importance >= threshold)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getPinnedMemories(projectId: string): Promise<Memory[]> {
    return await db.memories
      .where('projectId').equals(projectId)
      .and(m => m.isPinned)
      .toArray();
  }

  async updateMemoryAccess(memoryId: string): Promise<void> {
    await db.memories.update(memoryId, {
      accessedAt: new Date()
    });
  }

  async updateMemoryImportance(memoryId: string, importance: number): Promise<void> {
    await db.memories.update(memoryId, { importance });
  }

  async pruneMemories(projectId: string, options: {
    minImportance?: number;
    maxAge?: number;
    keepPinned?: boolean;
  } = {}): Promise<number> {
    const {
      minImportance = 0.3,
      maxAge = 90 * 24 * 60 * 60 * 1000,
      keepPinned = true
    } = options;

    const cutoffDate = new Date(Date.now() - maxAge);
    
    const memoriesToDelete = await db.memories
      .where('projectId').equals(projectId)
      .and(m => {
        if (keepPinned && m.isPinned) return false;
        if (m.importance >= minImportance) return false;
        if (m.accessedAt > cutoffDate) return false;
        return true;
      })
      .toArray();

    for (const memory of memoriesToDelete) {
      await db.memories.delete(memory.id);
    }

    return memoriesToDelete.length;
  }

  async summarizeConversation(messages: Array<{ role: string; content: string }>): Promise<string> {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const summary = conversationText.substring(0, 500) + '...';
    return summary;
  }

  async buildKnowledgeGraph(projectId: string): Promise<Array<{
    source: string;
    target: string;
    relationship: string;
    strength: number;
  }>> {
    const memories = await db.memories.where('projectId').equals(projectId).toArray();
    const graph: Array<{
      source: string;
      target: string;
      relationship: string;
      strength: number;
    }> = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memA = memories[i];
        const memB = memories[j];

        if (!memA.embedding || !memB.embedding) continue;

        const similarity = this.cosineSimilarity(memA.embedding, memB.embedding);
        
        if (similarity > 0.7) {
          graph.push({
            source: memA.id,
            target: memB.id,
            relationship: this.inferRelationship(memA, memB),
            strength: similarity
          });
        }
      }
    }

    return graph;
  }

  private inferRelationship(memA: Memory, memB: Memory): string {
    if (memA.type === memB.type) return 'similar_type';
    if (memA.tags.some(tag => memB.tags.includes(tag))) return 'shared_tag';
    if (memA.references.includes(memB.id) || memB.references.includes(memA.id)) return 'referenced';
    return 'related';
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getStatistics(projectId?: string): Promise<{
    totalVectors: number;
    totalMemories: number;
    avgImportance: number;
    memoryTypes: Record<string, number>;
  }> {
    const vectors = await db.vectors.toArray();
    const memories = projectId
      ? await db.memories.where('projectId').equals(projectId).toArray()
      : await db.memories.toArray();

    const memoryTypes: Record<string, number> = {};
    let totalImportance = 0;

    for (const memory of memories) {
      memoryTypes[memory.type] = (memoryTypes[memory.type] || 0) + 1;
      totalImportance += memory.importance;
    }

    return {
      totalVectors: vectors.length,
      totalMemories: memories.length,
      avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      memoryTypes
    };
  }

  async clearNamespace(namespace: string): Promise<void> {
    await db.vectors.where('namespace').equals(namespace).delete();
  }

  async clearProjectMemories(projectId: string): Promise<void> {
    await db.memories.where('projectId').equals(projectId).delete();
  }
}

export const enhancedVectorDatabase = new EnhancedVectorDatabase();
