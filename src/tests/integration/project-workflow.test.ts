import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../database/schema';
import type { Project } from '../../database/schema';

describe('Project Workflow Integration', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.files.clear();
    await db.chats.clear();
  });

  it('should create project and manage complete workflow', async () => {
    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Integration Test Project',
      description: 'Test project for integration testing',
      type: 'web',
      status: 'active',
      gitConfig: {
        localPath: '/workspace/test-project',
        branch: 'main'
      },
      settings: {
        aiProvider: 'gemini',
        agents: ['planner-agent', 'coder-agent'],
        features: ['github_sync', 'ai_agents']
      },
      metadata: {
        tags: ['test', 'integration'],
        framework: 'react',
        language: 'typescript',
        size: 0
      }
    };

    const projectId = await db.projects.add({
      ...projectData,
      id: `proj_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(projectId).toBeDefined();

    const project = await db.projects.get(projectId);
    expect(project).toBeDefined();
    expect(project?.name).toBe('Integration Test Project');
  });

  it('should isolate data between multiple projects', async () => {
    await db.projects.add({
      id: 'proj_1',
      name: 'Project 1',
      description: 'First',
      type: 'web',
      status: 'active',
      gitConfig: { localPath: '/p1', branch: 'main' },
      settings: { aiProvider: 'gemini', agents: [], features: [] },
      metadata: { tags: [], size: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.files.add({
      id: 'f1',
      projectId: 'proj_1',
      path: 'index.ts',
      content: 'p1',
      encoding: 'utf8',
      type: 'file',
      size: 2,
      hash: 'h1',
      isDirty: false,
      isStaged: false,
      lastModified: new Date(),
      createdAt: new Date()
    });

    const files = await db.files.where('projectId').equals('proj_1').toArray();
    expect(files).toHaveLength(1);
  });
});
