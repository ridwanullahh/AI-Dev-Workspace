import git from 'isomorphic-git';
import { db } from '../database/schema';
import type { Project, FileEntry, Commit } from '../database/schema';

export interface GitDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{
      type: 'add' | 'del' | 'context';
      content: string;
    }>;
  }>;
}

export interface GitBranch {
  name: string;
  oid: string;
  current: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

export class GitCoreService {
  private fs: any;
  
  constructor() {
    // Use BrowserFS or similar for filesystem operations
    this.initializeFS();
  }

  private async initializeFS() {
    // Initialize filesystem for git operations
    // This would use OPFS in production
    this.fs = await import('@isomorphic-git/lightning-fs');
  }

  // Repository lifecycle
  async initRepository(projectId: string, path: string): Promise<void> {
    try {
      await git.init({
        fs: this.fs,
        dir: path,
        defaultBranch: 'main'
      });

      await this.updateProjectGitConfig(projectId, {
        localPath: path,
        branch: 'main',
        lastSync: new Date()
      });

      // Create initial commit
      await this.createCommit(projectId, 'Initial commit', ['README.md']);
    } catch (error) {
      console.error('Failed to initialize repository:', error);
      throw new Error(`Failed to initialize Git repository: ${error.message}`);
    }
  }

  async cloneRepository(url: string, projectId: string, path: string): Promise<void> {
    try {
      await git.clone({
        fs: this.fs,
        http: require('isomorphic-git/http/web'),
        dir: path,
        url,
        singleBranch: true,
        depth: 1
      });

      await this.updateProjectGitConfig(projectId, {
        localPath: path,
        remoteUrl: url,
        branch: 'main',
        lastSync: new Date()
      });
    } catch (error) {
      console.error('Failed to clone repository:', error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  // Branch operations
  async createBranch(projectId: string, branchName: string, startPoint?: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      await git.branch({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        ref: branchName,
        object: startPoint
      });
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      await git.checkout({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        ref: branchName
      });

      await this.updateProjectGitConfig(projectId, {
        ...project.gitConfig,
        branch: branchName
      });
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  async getBranches(projectId: string): Promise<GitBranch[]> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      const branches = await git.listBranches({
        fs: this.fs,
        dir: project.gitConfig.localPath
      });

      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: project.gitConfig.localPath
      });

      return branches.map(name => ({
        name,
        oid: '', // Would need to fetch OID
        current: name === currentBranch
      }));
    } catch (error) {
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  // Diff and patch operations
  async generateDiff(projectId: string, filePath?: string): Promise<GitDiff[]> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      const statusMatrix = await git.statusMatrix({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        filepaths: filePath ? [filePath] : undefined
      });

      const diffs: GitDiff[] = [];

      for (const [filepath, headStatus, workdirStatus, stageStatus] of statusMatrix) {
        if (headStatus === workdirStatus) continue; // No changes

        const diff = await this.createFileDiff(
          project.gitConfig.localPath,
          filepath,
          headStatus,
          workdirStatus
        );

        if (diff) diffs.push(diff);
      }

      return diffs;
    } catch (error) {
      throw new Error(`Failed to generate diff: ${error.message}`);
    }
  }

  private async createFileDiff(
    repoPath: string, 
    filepath: string, 
    headStatus: number, 
    workdirStatus: number
  ): Promise<GitDiff | null> {
    try {
      let oldContent = '';
      let newContent = '';
      let type: 'added' | 'modified' | 'deleted';

      if (headStatus === 1 && workdirStatus === 2) {
        // Modified file
        type = 'modified';
        oldContent = await this.getFileContent(repoPath, filepath, 'HEAD');
        newContent = await this.getFileContent(repoPath, filepath, 'workdir');
      } else if (headStatus === 0 && workdirStatus === 2) {
        // Added file
        type = 'added';
        newContent = await this.getFileContent(repoPath, filepath, 'workdir');
      } else if (headStatus === 1 && workdirStatus === 0) {
        // Deleted file
        type = 'deleted';
        oldContent = await this.getFileContent(repoPath, filepath, 'HEAD');
      } else {
        return null;
      }

      const hunks = this.generateHunks(oldContent, newContent);

      return {
        path: filepath,
        type,
        oldContent,
        newContent,
        hunks
      };
    } catch (error) {
      console.error('Failed to create file diff:', error);
      return null;
    }
  }

  private generateHunks(oldContent: string, newContent: string) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    // Simple diff algorithm - in production, use a proper diff library
    const hunks = [];
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const hunkLines = [];
      const hunkStart = { old: oldIndex, new: newIndex };
      
      // Find differences
      while (oldIndex < oldLines.length && newIndex < newLines.length) {
        if (oldLines[oldIndex] === newLines[newIndex]) {
          hunkLines.push({
            type: 'context' as const,
            content: oldLines[oldIndex]
          });
          oldIndex++;
          newIndex++;
        } else {
          // Handle deletions
          while (oldIndex < oldLines.length && 
                 (newIndex >= newLines.length || oldLines[oldIndex] !== newLines[newIndex])) {
            hunkLines.push({
              type: 'del' as const,
              content: oldLines[oldIndex]
            });
            oldIndex++;
          }
          
          // Handle additions
          while (newIndex < newLines.length && 
                 (oldIndex >= oldLines.length || oldLines[oldIndex] !== newLines[newIndex])) {
            hunkLines.push({
              type: 'add' as const,
              content: newLines[newIndex]
            });
            newIndex++;
          }
        }
        
        if (hunkLines.length > 50) break; // Limit hunk size
      }
      
      if (hunkLines.length > 0) {
        hunks.push({
          oldStart: hunkStart.old + 1,
          oldLines: oldIndex - hunkStart.old,
          newStart: hunkStart.new + 1,
          newLines: newIndex - hunkStart.new,
          lines: hunkLines
        });
      }
      
      if (oldIndex >= oldLines.length && newIndex >= newLines.length) break;
    }
    
    return hunks;
  }

  async applyPatch(projectId: string, diff: GitDiff): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      if (diff.type === 'deleted') {
        await this.fs.promises.unlink(`${project.gitConfig.localPath}/${diff.path}`);
      } else {
        const content = diff.newContent || '';
        await this.fs.promises.writeFile(
          `${project.gitConfig.localPath}/${diff.path}`,
          content,
          'utf8'
        );
      }

      // Update file entry in database
      await this.updateFileEntry(projectId, diff.path, diff.newContent || '');
    } catch (error) {
      throw new Error(`Failed to apply patch: ${error.message}`);
    }
  }

  // Staging operations
  async stageFile(projectId: string, filePath: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      await git.add({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        filepath: filePath
      });

      await db.files.where({ projectId, path: filePath }).modify({
        isStaged: true
      });
    } catch (error) {
      throw new Error(`Failed to stage file: ${error.message}`);
    }
  }

  async unstageFile(projectId: string, filePath: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      await git.resetIndex({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        filepath: filePath
      });

      await db.files.where({ projectId, path: filePath }).modify({
        isStaged: false
      });
    } catch (error) {
      throw new Error(`Failed to unstage file: ${error.message}`);
    }
  }

  async createCommit(projectId: string, message: string, files?: string[]): Promise<string> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Stage specified files or all changed files
      if (files) {
        for (const file of files) {
          await this.stageFile(projectId, file);
        }
      }

      const oid = await git.commit({
        fs: this.fs,
        dir: project.gitConfig.localPath,
        message,
        author: {
          name: 'AI Dev Workspace',
          email: 'dev@aiworkspace.app'
        }
      });

      // Save commit to database
      const commitRecord: Commit = {
        id: `commit_${Date.now()}`,
        projectId,
        hash: oid,
        message,
        author: 'AI Dev Workspace',
        timestamp: new Date(),
        files: files || [],
        parentHashes: []
      };

      await db.commits.add(commitRecord);
      return oid;
    } catch (error) {
      throw new Error(`Failed to create commit: ${error.message}`);
    }
  }

  // Utility methods
  private async getFileContent(repoPath: string, filepath: string, ref: string): Promise<string> {
    try {
      if (ref === 'workdir') {
        return await this.fs.promises.readFile(`${repoPath}/${filepath}`, 'utf8');
      } else {
        const { blob } = await git.readBlob({
          fs: this.fs,
          dir: repoPath,
          oid: ref,
          filepath
        });
        return new TextDecoder().decode(blob);
      }
    } catch (error) {
      return '';
    }
  }

  private async updateProjectGitConfig(projectId: string, gitConfig: any): Promise<void> {
    await db.projects.update(projectId, {
      gitConfig,
      updatedAt: new Date()
    });
  }

  private async updateFileEntry(projectId: string, path: string, content: string): Promise<void> {
    const fileEntry: Partial<FileEntry> = {
      projectId,
      path,
      content,
      size: content.length,
      hash: await this.calculateHash(content),
      isDirty: true,
      lastModified: new Date()
    };

    await db.files.where({ projectId, path }).modify(fileEntry);
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const gitCore = new GitCoreService();