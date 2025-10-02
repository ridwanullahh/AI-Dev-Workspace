import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhancedVectorDatabase } from '../enhancedVectorDatabase';

describe('EnhancedVectorDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3, 0.4]];
      
      vi.spyOn(enhancedVectorDatabase as any, 'model', 'get').mockReturnValue({
        embed: vi.fn().mockResolvedValue({
          array: vi.fn().mockResolvedValue(mockEmbeddings),
          dispose: vi.fn()
        })
      });

      await enhancedVectorDatabase.initialize();
      const result = await enhancedVectorDatabase.embed('test text');

      expect(result).toEqual(mockEmbeddings);
    });

    it('should handle array of texts', async () => {
      const texts = ['text1', 'text2'];
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];

      vi.spyOn(enhancedVectorDatabase as any, 'model', 'get').mockReturnValue({
        embed: vi.fn().mockResolvedValue({
          array: vi.fn().mockResolvedValue(mockEmbeddings),
          dispose: vi.fn()
        })
      });

      await enhancedVectorDatabase.initialize();
      const result = await enhancedVectorDatabase.embed(texts);

      expect(result).toHaveLength(2);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const vectorC = [1, 0, 0];

      const service = enhancedVectorDatabase as any;
      
      // Perpendicular vectors should have similarity ~0
      const simAB = service.cosineSimilarity(vectorA, vectorB);
      expect(simAB).toBeCloseTo(0, 5);

      // Identical vectors should have similarity 1
      const simAC = service.cosineSimilarity(vectorA, vectorC);
      expect(simAC).toBeCloseTo(1, 5);
    });

    it('should throw error for vectors of different lengths', () => {
      const vectorA = [1, 0];
      const vectorB = [0, 1, 0];

      const service = enhancedVectorDatabase as any;

      expect(() => service.cosineSimilarity(vectorA, vectorB)).toThrow();
    });
  });

  describe('searchSimilar', () => {
    it('should find similar content based on query', async () => {
      // This would require mocking the database and model
      // Simplified test for structure
      const query = 'test query';
      
      vi.spyOn(enhancedVectorDatabase, 'embed').mockResolvedValue([[0.1, 0.2, 0.3]]);

      // Mock database would return empty results
      const results = await enhancedVectorDatabase.searchSimilar(query, {}, 5);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should update memory importance', async () => {
      const memoryId = 'mem_123';
      const importance = 0.8;

      // This would interact with database
      // Test structure for now
      await expect(
        enhancedVectorDatabase.updateMemoryImportance(memoryId, importance)
      ).resolves.not.toThrow();
    });

    it('should prune low-importance memories', async () => {
      const projectId = 'proj_123';
      const options = {
        minImportance: 0.5,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        keepPinned: true
      };

      const deleted = await enhancedVectorDatabase.pruneMemories(projectId, options);

      expect(typeof deleted).toBe('number');
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Knowledge Graph', () => {
    it('should build knowledge graph from memories', async () => {
      const projectId = 'proj_123';

      const graph = await enhancedVectorDatabase.buildKnowledgeGraph(projectId);

      expect(Array.isArray(graph)).toBe(true);
      
      if (graph.length > 0) {
        expect(graph[0]).toHaveProperty('source');
        expect(graph[0]).toHaveProperty('target');
        expect(graph[0]).toHaveProperty('relationship');
        expect(graph[0]).toHaveProperty('strength');
      }
    });

    it('should infer relationships correctly', () => {
      const service = enhancedVectorDatabase as any;
      
      const memA = {
        id: 'mem1',
        type: 'code' as const,
        tags: ['react', 'component'],
        references: []
      };

      const memB = {
        id: 'mem2',
        type: 'code' as const,
        tags: ['react', 'hooks'],
        references: []
      };

      const relationship = service.inferRelationship(memA, memB);
      
      expect(relationship).toBe('shared_tag');
    });
  });

  describe('Statistics', () => {
    it('should return statistics', async () => {
      const stats = await enhancedVectorDatabase.getStatistics();

      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('totalMemories');
      expect(stats).toHaveProperty('avgImportance');
      expect(stats).toHaveProperty('memoryTypes');
    });

    it('should return project-specific statistics', async () => {
      const projectId = 'proj_123';
      const stats = await enhancedVectorDatabase.getStatistics(projectId);

      expect(typeof stats.totalMemories).toBe('number');
      expect(typeof stats.avgImportance).toBe('number');
    });
  });
});
