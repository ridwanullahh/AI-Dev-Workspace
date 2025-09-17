import { StorageService } from './StorageService';
import git from 'isomorphic-git';

interface GitRepository {
  id: string;
  projectId: string;
  name: string;
  url: string;
  localPath: string;
  branch: string;
  lastCommit: string;
  isClean: boolean;
  remoteStatus: 'synced' | 'ahead' | 'behind' | 'diverged';
  credentials?: {
    username: string;
    token: string;
  };
}

interface CommitInfo {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
}

interface FileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked';
}

class GitManager {
  private fs: any;
  private repositories: Map<string, GitRepository> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Initialize Lightning FS for browser-based file system
      this.fs = new (require('lightning-fs'))('git-workspace');
      
      // Configure IsomorphicGit
      // @ts-ignore
      git.plugins.set('http', require('isomorphic-git/http/web'));
      
      // Load existing repositories
      await this.loadRepositories();
      
      this.isInitialized = true;
      console.log('Git manager initialized');
    } catch (error) {
      console.error('Failed to initialize Git manager:', error);
      throw error;
    }
  }

  private async loadRepositories(): Promise<void> {
    try {
      const repos = await StorageService.getAllGitRepositories();
      for (const repo of repos) {
        this.repositories.set(repo.id, { ...repo, name: repo.name || '', localPath: `/repos/${repo.id}` } as GitRepository);
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  }

  private async saveRepositories(): Promise<void> {
    try {
      for (const repo of this.repositories.values()) {
        if (await StorageService.getGitRepository(repo.id)) {
          await StorageService.updateGitRepository(repo.id, repo);
        } else {
          await StorageService.addGitRepository({ ...repo });
        }
      }
    } catch (error) {
      console.error('Failed to save repositories:', error);
    }
  }

  async cloneRepository(projectId: string, url: string, options: {
    name?: string;
    branch?: string;
    credentials?: {
      username: string;
      token: string;
    };
  } = {}): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const repoId = `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const repoName = options.name || this.extractRepoName(url);
    const localPath = `/repos/${repoId}`;
    const branch = options.branch || 'main';

    try {
      // Ensure directory exists
      await this.fs.mkdir(localPath, { recursive: true });

      // Configure authentication if provided
      const authConfig = options.credentials ? {
        username: options.credentials.username,
        password: options.credentials.token
      } : undefined;

      // Clone repository
      await git.clone({
        fs: this.fs,
        http: require('isomorphic-git/http/web'),
        dir: localPath,
        url: url,
        ref: branch,
        singleBranch: true,
        depth: 50, // Shallow clone for performance
        ...authConfig && { onAuth: () => authConfig }
      });

      // Get initial commit info
      const commits = await git.log({
        fs: this.fs,
        dir: localPath,
        depth: 1
      });

      const repository: GitRepository = {
        id: repoId,
        projectId: projectId,
        name: repoName,
        url: url,
        localPath: localPath,
        branch: branch,
        lastCommit: commits[0]?.oid || '',
        isClean: true,
        remoteStatus: 'synced',
        credentials: options.credentials
      };

      this.repositories.set(repoId, repository);
      await this.saveRepositories();

      return repoId;
    } catch (error) {
      // Clean up on failure
      try {
        await this.fs.rmdir(localPath, { recursive: true });
      } catch (cleanupError) {
        console.error('Failed to clean up after failed clone:', cleanupError);
      }
      
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  private extractRepoName(url: string): string {
    const match = url.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }

  async initRepository(projectId: string, name: string, initialFiles?: Array<{
    path: string;
    content: string;
  }>): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const repoId = `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localPath = `/repos/${repoId}`;

    try {
      // Create directory
      await this.fs.mkdir(localPath, { recursive: true });

      // Initialize Git repository
      await git.init({
        fs: this.fs,
        dir: localPath,
        defaultBranch: 'main'
      });

      // Add initial files if provided
      if (initialFiles && initialFiles.length > 0) {
        for (const file of initialFiles) {
          const filePath = `${localPath}/${file.path}`;
          const dir = filePath.substring(0, filePath.lastIndexOf('/'));
          
          // Ensure directory exists
          await this.fs.mkdir(dir, { recursive: true });
          
          // Write file
          await this.fs.writeFile(filePath, file.content, 'utf8');
        }

        // Stage all files
        await git.add({
          fs: this.fs,
          dir: localPath,
          filepath: '.'
        });

        // Initial commit
        const initialCommit = await git.commit({
          fs: this.fs,
          dir: localPath,
          message: 'Initial commit',
          author: {
            name: 'AI Workspace',
            email: 'ai@workspace.dev'
          }
        });

        const repository: GitRepository = {
          id: repoId,
          projectId: projectId,
          name: name,
          url: '',
          localPath: localPath,
          branch: 'main',
          lastCommit: initialCommit,
          isClean: true,
          remoteStatus: 'synced'
        };

        this.repositories.set(repoId, repository);
        await this.saveRepositories();
      }

      return repoId;
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error.message}`);
    }
  }

  async getFileContent(repoId: string, filePath: string): Promise<string> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const fullPath = `${repo.localPath}/${filePath}`;
      return await this.fs.readFile(fullPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(repoId: string, filePath: string, content: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const fullPath = `${repo.localPath}/${filePath}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      
      // Ensure directory exists
      await this.fs.mkdir(dir, { recursive: true });
      
      // Write file
      await this.fs.writeFile(fullPath, content, 'utf8');
      
      // Update repository status
      repo.isClean = false;
      await this.saveRepositories();
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async getStatus(repoId: string): Promise<FileStatus[]> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const status = await git.statusMatrix({
        fs: this.fs,
        dir: repo.localPath
      });

      const fileStatuses: FileStatus[] = [];
      
      for (const [filepath, headStatus, workdirStatus, stageStatus] of status) {
        if (headStatus === 1 && workdirStatus === 1 && stageStatus === 1) {
          // File is unchanged
          continue;
        }

        let fileStatus: FileStatus['status'];
        
        if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
          fileStatus = 'untracked';
        } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
          fileStatus = 'modified';
        } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
          fileStatus = 'deleted';
        } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
          fileStatus = 'added';
        } else {
          fileStatus = 'modified';
        }

        fileStatuses.push({
          path: filepath,
          status: fileStatus
        });
      }

      return fileStatuses;
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  async stageFile(repoId: string, filePath: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      await git.add({
        fs: this.fs,
        dir: repo.localPath,
        filepath: filePath
      });
    } catch (error) {
      throw new Error(`Failed to stage file: ${error.message}`);
    }
  }

  async stageAll(repoId: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      await git.add({
        fs: this.fs,
        dir: repo.localPath,
        filepath: '.'
      });
    } catch (error) {
      throw new Error(`Failed to stage all files: ${error.message}`);
    }
  }

  async commit(repoId: string, message: string, author?: {
    name: string;
    email: string;
  }): Promise<string> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const commitOid = await git.commit({
        fs: this.fs,
        dir: repo.localPath,
        message: message,
        author: author || {
          name: 'AI Workspace',
          email: 'ai@workspace.dev'
        }
      });

      // Update repository info
      repo.lastCommit = commitOid;
      repo.isClean = true;
      await this.saveRepositories();

      return commitOid;
    } catch (error) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  async getCommitHistory(repoId: string, options: {
    depth?: number;
    since?: Date;
  } = {}): Promise<CommitInfo[]> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const commits = await git.log({
        fs: this.fs,
        dir: repo.localPath,
        depth: options.depth || 50,
        since: options.since
      });

      return commits.map(commit => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          timestamp: commit.commit.committer.timestamp
        }
      }));
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  async createBranch(repoId: string, branchName: string, startPoint?: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      await git.branch({
        fs: this.fs,
        dir: repo.localPath,
        ref: branchName,
        object: startPoint || repo.lastCommit
      });
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  async switchBranch(repoId: string, branchName: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      await git.checkout({
        fs: this.fs,
        dir: repo.localPath,
        ref: branchName
      });

      repo.branch = branchName;
      await this.saveRepositories();
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  async listBranches(repoId: string): Promise<string[]> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      return await git.listBranches({
        fs: this.fs,
        dir: repo.localPath
      });
    } catch (error) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  async push(repoId: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');
    if (!repo.url) throw new Error('No remote URL configured');

    try {
      const authConfig = repo.credentials ? {
        username: repo.credentials.username,
        password: repo.credentials.token
      } : undefined;

      await git.push({
        fs: this.fs,
        http: require('isomorphic-git/http/web'),
        dir: repo.localPath,
        remote: 'origin',
        ref: repo.branch,
        ...authConfig && { onAuth: () => authConfig }
      });

      repo.remoteStatus = 'synced';
      await this.saveRepositories();
    } catch (error) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  async pull(repoId: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');
    if (!repo.url) throw new Error('No remote URL configured');

    try {
      const authConfig = repo.credentials ? {
        username: repo.credentials.username,
        password: repo.credentials.token
      } : undefined;

      await git.pull({
        fs: this.fs,
        http: require('isomorphic-git/http/web'),
        dir: repo.localPath,
        ref: repo.branch,
        ...authConfig && { onAuth: () => authConfig }
      });

      // Update last commit
      const commits = await git.log({
        fs: this.fs,
        dir: repo.localPath,
        depth: 1
      });

      repo.lastCommit = commits[0]?.oid || '';
      repo.remoteStatus = 'synced';
      await this.saveRepositories();
    } catch (error) {
      throw new Error(`Failed to pull: ${error.message}`);
    }
  }

  async getDiff(repoId: string, options: {
    filepath?: string;
    ref1?: string;
    ref2?: string;
  } = {}): Promise<string> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      // For now, return a simplified diff
      // In a full implementation, this would use a proper diff algorithm
      const status = await this.getStatus(repoId);
      
      let diffOutput = '';
      for (const fileStatus of status) {
        if (fileStatus.status === 'modified') {
          diffOutput += `Modified: ${fileStatus.path}\n`;
        } else if (fileStatus.status === 'added') {
          diffOutput += `Added: ${fileStatus.path}\n`;
        } else if (fileStatus.status === 'deleted') {
          diffOutput += `Deleted: ${fileStatus.path}\n`;
        }
      }

      return diffOutput;
    } catch (error) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  async getRepositories(): Promise<GitRepository[]> {
    return Array.from(this.repositories.values());
  }

  async getRepository(repoId: string): Promise<GitRepository | undefined> {
    return this.repositories.get(repoId);
  }

  async deleteRepository(repoId: string): Promise<void> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      // Remove local files
      await this.fs.rmdir(repo.localPath, { recursive: true });
      
      // Remove from registry
      this.repositories.delete(repoId);
      await this.saveRepositories();
    } catch (error) {
      throw new Error(`Failed to delete repository: ${error.message}`);
    }
  }

  async listFiles(repoId: string, directory: string = ''): Promise<Array<{
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
  }>> {
    const repo = this.repositories.get(repoId);
    if (!repo) throw new Error('Repository not found');

    try {
      const fullPath = directory ? `${repo.localPath}/${directory}` : repo.localPath;
      const entries = await this.fs.readdir(fullPath);
      
      const fileList = [];
      for (const entry of entries) {
        if (entry.startsWith('.git')) continue; // Skip .git directory
        
        const entryPath = directory ? `${directory}/${entry}` : entry;
        const fullEntryPath = `${fullPath}/${entry}`;
        
        try {
          const stat = await this.fs.stat(fullEntryPath);
          fileList.push({
            name: entry,
            path: entryPath,
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.isFile() ? stat.size : undefined
          });
        } catch (statError) {
          // Skip entries that can't be statted
          continue;
        }
      }

      return fileList.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
}

export const gitManager = new GitManager();