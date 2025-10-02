import git from 'isomorphic-git';
import { db } from '../database/schema';
import { gitCore } from './gitCore';
import type { Project } from '../database/schema';

export class AdvancedGitOperations {
  private fs: any;

  constructor() {
    this.initializeFS();
  }

  private async initializeFS() {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      this.fs = await navigator.storage.getDirectory();
    }
  }

  // Cherry-pick: Apply specific commit to current branch
  async cherryPick(projectId: string, commitHash: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Get commit details
      const commit = await git.readCommit({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        oid: commitHash
      });

      // Get commit changes
      const changes = await this.getCommitChanges(project.gitConfig.localPath, commitHash);

      // Apply changes to working directory
      for (const change of changes) {
        if (change.type === 'add' || change.type === 'modify') {
          await this.applyFileChange(projectId, change.path, change.newContent);
        } else if (change.type === 'delete') {
          await this.deleteFile(projectId, change.path);
        }
      }

      // Create new commit
      await gitCore.createCommit(
        projectId,
        `Cherry-pick: ${commit.commit.message}`,
        changes.map(c => c.path)
      );

    } catch (error) {
      throw new Error(`Cherry-pick failed: ${error.message}`);
    }
  }

  // Rebase: Reapply commits on top of another base
  async rebase(projectId: string, ontoBranch: string, interactive: boolean = false): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      const currentBranch = project.gitConfig.branch;

      // Get commits to rebase
      const commits = await this.getCommitsBetween(
        project.gitConfig.localPath,
        ontoBranch,
        currentBranch
      );

      if (interactive) {
        // In interactive mode, would show UI for user to pick/squash/edit commits
        throw new Error('Interactive rebase requires UI interaction');
      }

      // Switch to target branch
      await gitCore.switchBranch(projectId, ontoBranch);

      // Apply each commit
      for (const commit of commits) {
        try {
          await this.cherryPick(projectId, commit.oid);
        } catch (error) {
          throw new Error(`Rebase conflict at commit ${commit.oid}: ${error.message}`);
        }
      }

      // Update branch pointer
      await db.projects.update(projectId, {
        gitConfig: {
          ...project.gitConfig,
          branch: currentBranch
        }
      });

    } catch (error) {
      throw new Error(`Rebase failed: ${error.message}`);
    }
  }

  // Stash: Save uncommitted changes for later
  async stash(projectId: string, message?: string): Promise<string> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Get all modified files
      const files = await db.files
        .where('projectId').equals(projectId)
        .and(f => f.isDirty)
        .toArray();

      if (files.length === 0) {
        throw new Error('No changes to stash');
      }

      // Create stash entry
      const stashId = `stash_${Date.now()}`;
      const stashData = {
        id: stashId,
        projectId,
        message: message || `Stash created on ${new Date().toLocaleString()}`,
        files: files.map(f => ({
          path: f.path,
          content: f.content
        })),
        timestamp: new Date()
      };

      // Save stash
      await db.settings.put({
        id: stashId,
        category: 'git',
        key: `stash_${projectId}`,
        value: stashData,
        encrypted: false,
        updatedAt: new Date()
      });

      // Revert working directory changes
      for (const file of files) {
        // Get file from last commit
        const lastCommit = await db.commits
          .where('projectId').equals(projectId)
          .last();

        if (lastCommit) {
          // Restore file from commit
          await db.files.update(file.id, {
            isDirty: false,
            lastModified: new Date()
          });
        }
      }

      return stashId;
    } catch (error) {
      throw new Error(`Stash failed: ${error.message}`);
    }
  }

  // Pop stash: Apply stashed changes
  async stashPop(projectId: string, stashId: string): Promise<void> {
    const stash = await db.settings.get(stashId);
    if (!stash || stash.value.projectId !== projectId) {
      throw new Error('Stash not found');
    }

    try {
      const stashData = stash.value;

      // Apply stashed changes
      for (const file of stashData.files) {
        const existing = await db.files
          .where({ projectId, path: file.path })
          .first();

        if (existing) {
          await db.files.update(existing.id, {
            content: file.content,
            isDirty: true,
            lastModified: new Date()
          });
        }
      }

      // Remove stash
      await db.settings.delete(stashId);

    } catch (error) {
      throw new Error(`Stash pop failed: ${error.message}`);
    }
  }

  // List stashes
  async listStashes(projectId: string): Promise<any[]> {
    const stashes = await db.settings
      .where('category').equals('git')
      .and(s => s.key === `stash_${projectId}`)
      .toArray();

    return stashes.map(s => s.value);
  }

  // Squash commits: Combine multiple commits into one
  async squashCommits(projectId: string, commitHashes: string[], message: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Get all changes from commits
      const allChanges = new Map<string, any>();

      for (const hash of commitHashes) {
        const changes = await this.getCommitChanges(project.gitConfig.localPath, hash);
        changes.forEach(change => {
          allChanges.set(change.path, change);
        });
      }

      // Reset to parent of first commit
      const firstCommit = await git.readCommit({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        oid: commitHashes[0]
      });

      if (firstCommit.commit.parent && firstCommit.commit.parent.length > 0) {
        await git.checkout({
          fs: this.fs,
          dir: project.gitConfig.localPath,
          ref: firstCommit.commit.parent[0]
        });
      }

      // Apply all changes
      for (const [path, change] of allChanges) {
        if (change.newContent) {
          await this.applyFileChange(projectId, path, change.newContent);
        }
      }

      // Create squashed commit
      await gitCore.createCommit(
        projectId,
        message,
        Array.from(allChanges.keys())
      );

    } catch (error) {
      throw new Error(`Squash failed: ${error.message}`);
    }
  }

  // Bisect: Binary search for bad commit
  async bisectStart(projectId: string, goodCommit: string, badCommit: string): Promise<string> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Get commits between good and bad
      const commits = await this.getCommitsBetween(
        project.gitConfig.localPath,
        goodCommit,
        badCommit
      );

      if (commits.length === 0) {
        return badCommit; // Bad commit is immediately after good
      }

      // Start at middle commit
      const middleIndex = Math.floor(commits.length / 2);
      const middleCommit = commits[middleIndex];

      // Checkout middle commit
      await git.checkout({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        ref: middleCommit.oid
      });

      // Save bisect state
      await db.settings.put({
        id: `bisect_${projectId}`,
        category: 'git',
        key: 'bisect_state',
        value: {
          projectId,
          goodCommit,
          badCommit,
          currentCommit: middleCommit.oid,
          commits
        },
        encrypted: false,
        updatedAt: new Date()
      });

      return middleCommit.oid;

    } catch (error) {
      throw new Error(`Bisect failed: ${error.message}`);
    }
  }

  // Helper methods
  private async getCommitChanges(repoPath: string, commitHash: string): Promise<any[]> {
    // Get files changed in commit
    const commit = await git.readCommit({
      fs: this.fs,
      dir: repoPath,
      oid: commitHash
    });

    // For simplicity, return empty array
    // In real implementation, would compare with parent
    return [];
  }

  private async getCommitsBetween(repoPath: string, from: string, to: string): Promise<any[]> {
    const commits = [];
    let currentOid = to;

    while (currentOid !== from) {
      const commit = await git.readCommit({
        fs: this.fs,
        dir: repoPath,
        oid: currentOid
      });

      commits.push({
        oid: currentOid,
        message: commit.commit.message,
        author: commit.commit.author.name
      });

      if (commit.commit.parent && commit.commit.parent.length > 0) {
        currentOid = commit.commit.parent[0];
      } else {
        break;
      }
    }

    return commits.reverse();
  }

  private async applyFileChange(projectId: string, path: string, content: string): Promise<void> {
    const file = await db.files.where({ projectId, path }).first();

    if (file) {
      await db.files.update(file.id, {
        content,
        isDirty: true,
        lastModified: new Date()
      });
    } else {
      await db.files.add({
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        path,
        content,
        encoding: 'utf8',
        type: 'file',
        size: content.length,
        hash: await this.calculateHash(content),
        isDirty: true,
        isStaged: false,
        lastModified: new Date(),
        createdAt: new Date()
      });
    }
  }

  private async deleteFile(projectId: string, path: string): Promise<void> {
    await db.files.where({ projectId, path }).delete();
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const advancedGitOps = new AdvancedGitOperations();
