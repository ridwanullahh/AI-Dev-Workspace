import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gitCore } from '../gitCore';

describe('GitCoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Diff Generation', () => {
    it('should generate hunks from file differences', () => {
      const service = gitCore as any;
      
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2 modified\nline3\nline4';

      const hunks = service.generateHunks(oldContent, newContent);

      expect(hunks).toBeInstanceOf(Array);
      expect(hunks.length).toBeGreaterThan(0);
      
      const firstHunk = hunks[0];
      expect(firstHunk).toHaveProperty('oldStart');
      expect(firstHunk).toHaveProperty('newStart');
      expect(firstHunk).toHaveProperty('lines');
    });

    it('should identify added lines', () => {
      const service = gitCore as any;
      
      const oldContent = 'line1';
      const newContent = 'line1\nline2';

      const hunks = service.generateHunks(oldContent, newContent);
      const addedLines = hunks[0].lines.filter((l: any) => l.type === 'add');

      expect(addedLines.length).toBeGreaterThan(0);
    });

    it('should identify deleted lines', () => {
      const service = gitCore as any;
      
      const oldContent = 'line1\nline2';
      const newContent = 'line1';

      const hunks = service.generateHunks(oldContent, newContent);
      const deletedLines = hunks[0].lines.filter((l: any) => l.type === 'del');

      expect(deletedLines.length).toBeGreaterThan(0);
    });

    it('should identify context lines', () => {
      const service = gitCore as any;
      
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2 modified\nline3';

      const hunks = service.generateHunks(oldContent, newContent);
      const contextLines = hunks[0].lines.filter((l: any) => l.type === 'context');

      expect(contextLines.length).toBeGreaterThan(0);
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate SHA-256 hash', async () => {
      const service = gitCore as any;
      const content = 'test content';

      // Mock crypto.subtle.digest
      global.crypto = {
        ...global.crypto,
        subtle: {
          ...global.crypto.subtle,
          digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer)
        }
      } as any;

      const hash = await service.calculateHash(content);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('Branch Operations', () => {
    it('should create branch', async () => {
      const projectId = 'proj_123';
      const branchName = 'feature/test';

      // This would interact with isomorphic-git
      await expect(
        gitCore.createBranch(projectId, branchName)
      ).resolves.not.toThrow();
    });

    it('should list branches', async () => {
      const projectId = 'proj_123';

      const branches = await gitCore.getBranches(projectId);

      expect(Array.isArray(branches)).toBe(true);
      
      branches.forEach(branch => {
        expect(branch).toHaveProperty('name');
        expect(branch).toHaveProperty('oid');
        expect(branch).toHaveProperty('current');
      });
    });
  });

  describe('Staging Operations', () => {
    it('should stage file', async () => {
      const projectId = 'proj_123';
      const filePath = 'src/test.ts';

      await expect(
        gitCore.stageFile(projectId, filePath)
      ).resolves.not.toThrow();
    });

    it('should unstage file', async () => {
      const projectId = 'proj_123';
      const filePath = 'src/test.ts';

      await expect(
        gitCore.unstageFile(projectId, filePath)
      ).resolves.not.toThrow();
    });
  });

  describe('Commit Operations', () => {
    it('should create commit with message', async () => {
      const projectId = 'proj_123';
      const message = 'Test commit';
      const files = ['src/test.ts'];

      const oid = await gitCore.createCommit(projectId, message, files);

      expect(typeof oid).toBe('string');
    });

    it('should create commit without specific files', async () => {
      const projectId = 'proj_123';
      const message = 'Commit all';

      const oid = await gitCore.createCommit(projectId, message);

      expect(typeof oid).toBe('string');
    });
  });

  describe('Patch Operations', () => {
    it('should apply patch for added file', async () => {
      const projectId = 'proj_123';
      const diff = {
        path: 'newfile.ts',
        type: 'added' as const,
        newContent: 'console.log("hello");',
        hunks: []
      };

      await expect(
        gitCore.applyPatch(projectId, diff)
      ).resolves.not.toThrow();
    });

    it('should apply patch for modified file', async () => {
      const projectId = 'proj_123';
      const diff = {
        path: 'existing.ts',
        type: 'modified' as const,
        oldContent: 'old content',
        newContent: 'new content',
        hunks: []
      };

      await expect(
        gitCore.applyPatch(projectId, diff)
      ).resolves.not.toThrow();
    });

    it('should apply patch for deleted file', async () => {
      const projectId = 'proj_123';
      const diff = {
        path: 'deleted.ts',
        type: 'deleted' as const,
        oldContent: 'content',
        hunks: []
      };

      await expect(
        gitCore.applyPatch(projectId, diff)
      ).resolves.not.toThrow();
    });
  });
});
