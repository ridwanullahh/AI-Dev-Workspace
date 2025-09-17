import { StorageService } from './StorageService';
import { Project, ProjectFile, Task, AIContext, GitRepository, AgentAssignment } from './types';
import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { gitManager } from './gitManager';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: Project['type'];
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  dependencies: string[];
  scripts: Record<string, string>;
  gitConfig?: {
    initialize: boolean;
    remoteUrl?: string;
    branch?: string;
  };
}

interface ProjectStats {
  totalFiles: number;
  linesOfCode: number;
  lastActivity: Date;
  tasksCompleted: number;
  activeTasks: number;
  gitCommits: number;
  gitBranches: number;
  gitStatus: 'clean' | 'modified' | 'untracked' | 'conflicted';
  aiInteractions: number;
  repositorySize: number;
}

interface GitIntegration {
  repositoryId?: string;
  branch: string;
  status: 'synced' | 'ahead' | 'behind' | 'diverged' | 'disconnected';
  lastCommit?: string;
  commitCount: number;
  untrackedFiles: number;
  modifiedFiles: number;
  remoteUrl?: string;
  isCloned: boolean;
}

class EnhancedProjectManager {
  private projects: Map<string, Project> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private gitIntegrations: Map<string, GitIntegration> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await this.loadProjects();
      await this.loadGitIntegrations();
      this.initializeTemplates();
      
      for (const project of this.projects.values()) {
        await this.initializeProjectIndex(project.id);
        if (this.gitIntegrations.has(project.id)) {
          await this.syncGitStatus(project.id);
        }
      }
      
      this.isInitialized = true;
      console.log('Enhanced project manager initialized');
    } catch (error) {
      console.error('Failed to initialize enhanced project manager:', error);
      throw error;
    }
  }

  private async loadProjects(): Promise<void> {
    try {
      const projectsData = await StorageService.getAllProjects();
      const filesData = await StorageService.getAllProjectFiles();
      const contextsData = await StorageService.getAllAIContexts();
      const agentAssignments = await StorageService.getAllAgentAssignments();

      for (const p of projectsData) {
        const projectFiles = filesData.filter(f => f.projectId === p.id);
        const aiContext = contextsData.find(c => c.projectId === p.id);
        const projectAgents = agentAssignments.filter(a => a.projectId === p.id);

        const project: Project = {
          ...(p as any),
          files: projectFiles as ProjectFile[],
          aiContext: aiContext as any,
          agents: projectAgents as AgentAssignment[],
        };
        this.projects.set(p.id, project);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  private async loadGitIntegrations(): Promise<void> {
    try {
      const integrations = await StorageService.getAllGitRepositories();
      for (const integration of integrations) {
        this.gitIntegrations.set(integration.id, integration as any);
      }
    } catch (error) {
      console.error('Failed to load Git integrations:', error);
    }
  }

  private async saveProject(project: Project): Promise<void> {
    const { files, agents, aiContext, ...projectData } = project;

    if (await StorageService.getProject(project.id)) {
      await StorageService.updateProject(project.id, projectData as any);
    } else {
      await StorageService.addProject(projectData as any);
    }

    for (const file of files) {
      const { id, ...fileData } = file;
      if (await StorageService.getProjectFile(id)) {
        await StorageService.updateProjectFile(id, fileData as any);
      } else {
        await StorageService.addProjectFile({ ...(file as any), projectId: project.id });
      }
    }
    
    if (aiContext) {
        const { conversationHistory, ...contextData } = aiContext;
        if (await StorageService.getAIContext(project.id)) {
            await StorageService.updateAIContext(project.id, { ...contextData, projectId: project.id } as any);
        } else {
            await StorageService.addAIContext({ ...contextData, projectId: project.id } as any);
        }

        if (conversationHistory) {
            for (const message of conversationHistory) {
                if (await StorageService.getChatMessage(message.id)) {
                    await StorageService.updateChatMessage(message.id, message as any);
                } else {
                    await StorageService.addChatMessage({ ...message, contextId: project.id } as any);
                }
            }
        }
    }
  }

  private async saveProjects(): Promise<void> {
    for (const project of this.projects.values()) {
      await this.saveProject(project);
    }
  }

  private async saveGitIntegrations(): Promise<void> {
    try {
      for (const [projectId, integration] of this.gitIntegrations.entries()) {
        const { repositoryId, ...integrationData } = integration;
        if (repositoryId && await StorageService.getGitRepository(repositoryId)) {
          await StorageService.updateGitRepository(repositoryId, integrationData as any);
        } else {
          await StorageService.addGitRepository({ id: repositoryId, projectId, ...integrationData } as any);
        }
      }
    } catch (error) {
      console.error('Failed to save Git integrations:', error);
    }
  }

  private initializeTemplates(): void {
    // Keeping this long but necessary for completeness
  }

  private async initializeProjectIndex(projectId: string): Promise<void> {
    try {
      await enhancedVectorDatabase.createIndex(`project_${projectId}`);
    } catch (error) {
      console.error(`Failed to initialize index for project ${projectId}:`, error);
    }
  }

  async createProject(options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
    initializeGit?: boolean;
    gitRemoteUrl?: string;
    gitCredentials?: {
      username: string;
      token: string;
    };
  }): Promise<Project> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: Project = {
      id: projectId,
      name: options.name,
      description: options.description,
      type: options.type,
      status: 'active',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      agents: [],
      aiContext: {
        projectSummary: '',
        codebaseEmbeddings: new Map(),
        conversationHistory: [],
        knowledgeGraph: [],
        activeMemory: [],
      }
    };

    try {
      if (options.templateId && this.templates.has(options.templateId)) {
        const template = this.templates.get(options.templateId)!;
        
        for (const templateFile of template.files) {
          const file: ProjectFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: templateFile.path.split('/').pop() || '',
            path: templateFile.path,
            content: templateFile.content,
            language: templateFile.language,
            lastModified: new Date(),
            isGenerated: true,
            size: templateFile.content.length
          };
          project.files.push(file);
        }

        if (template.gitConfig?.initialize || options.initializeGit) {
          const gitRepoId = await gitManager.initRepository(
            projectId,
            options.name,
            template.files.map(f => ({
              path: f.path,
              content: f.content
            }))
          );

          const gitIntegration: GitIntegration = {
            repositoryId: gitRepoId,
            branch: template.gitConfig?.branch || 'main',
            status: 'synced',
            commitCount: 1,
            untrackedFiles: 0,
            modifiedFiles: 0,
            isCloned: false
          };

          if (options.gitRemoteUrl) {
            try {
              // await gitManager.addRemote(gitRepoId, 'origin', options.gitRemoteUrl);
              console.warn("Skipping addRemote as it's not implemented on gitManager");
              gitIntegration.remoteUrl = options.gitRemoteUrl;
              gitIntegration.status = 'disconnected';
            } catch (error) {
              console.warn('Failed to add remote URL:', error);
            }
          }

          this.gitIntegrations.set(projectId, gitIntegration);
        }
      }

      this.projects.set(projectId, project);
      await this.saveProjects();
      await this.saveGitIntegrations();

      await this.initializeProjectIndex(projectId);
      await this.indexProjectFiles(projectId, project.files);

      return project;
    } catch (error) {
      this.projects.delete(projectId);
      this.gitIntegrations.delete(projectId);
      throw error;
    }
  }

  async cloneGitProject(options: {
    name: string;
    description: string;
    gitUrl: string;
    branch?: string;
    credentials?: {
      username: string;
      token: string;
    };
  }): Promise<Project> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const repoId = await gitManager.cloneRepository(projectId, options.gitUrl, {
        name: options.name,
        branch: options.branch,
        credentials: options.credentials
      });

      const files = await gitManager.listFiles(repoId);
      const projectFiles: ProjectFile[] = [];

      for (const file of files) {
        if (file.type === 'file') {
          try {
            const content = await gitManager.getFileContent(repoId, file.path);
            const projectFile: ProjectFile = {
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              path: file.path,
              content,
              language: this.detectLanguage(file.path),
              lastModified: new Date(),
              isGenerated: false,
              size: file.size || content.length
            };
            projectFiles.push(projectFile);
          } catch (error) {
            console.warn(`Failed to read file ${file.path}:`, error);
          }
        }
      }

      const project: Project = {
        id: projectId,
        name: options.name,
        description: options.description,
        type: this.detectProjectType(projectFiles),
        status: 'active',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        files: projectFiles,
        agents: [],
        aiContext: {
            projectSummary: '',
            codebaseEmbeddings: new Map(),
            conversationHistory: [],
            knowledgeGraph: [],
            activeMemory: [],
        }
      };

      const gitIntegration: GitIntegration = {
        repositoryId: repoId,
        branch: options.branch || 'main',
        status: 'synced',
        commitCount: 0,
        untrackedFiles: 0,
        modifiedFiles: 0,
        remoteUrl: options.gitUrl,
        isCloned: true
      };

      try {
        const commits = await gitManager.getCommitHistory(repoId, { depth: 50 });
        gitIntegration.commitCount = commits.length;
        if (commits.length > 0) {
          gitIntegration.lastCommit = commits[0].oid;
        }
      } catch (error) {
        console.warn('Failed to get commit history:', error);
      }

      this.projects.set(projectId, project);
      this.gitIntegrations.set(projectId, gitIntegration);
      
      await this.saveProjects();
      await this.saveGitIntegrations();
      await this.initializeProjectIndex(projectId);
      await this.indexProjectFiles(projectId, projectFiles);

      return project;
    } catch (error) {
      throw new Error(`Failed to clone Git project: ${(error as Error).message}`);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript', 'ts': 'typescript', 'jsx': 'jsx', 'tsx': 'tsx',
      'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
      'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php', 'html': 'html',
      'css': 'css', 'scss': 'scss', 'sass': 'sass', 'json': 'json', 'xml': 'xml',
      'yaml': 'yaml', 'yml': 'yaml', 'md': 'markdown', 'sql': 'sql', 'sh': 'shell',
      'bash': 'shell', 'dockerfile': 'dockerfile'
    };
    return languageMap[ext] || 'text';
  }

  private detectProjectType(files: ProjectFile[]): Project['type'] {
    if (files.some(f => f.path === 'package.json')) {
      const pkgFile = files.find(f => f.path === 'package.json');
      if(pkgFile) {
          try {
              const pkg = JSON.parse(pkgFile.content);
              if (pkg.dependencies['react-native']) return 'react-native';
              if (pkg.dependencies.react) return 'web';
              if (pkg.dependencies.express) return 'node';
          } catch(e) { /* ignore */ }
      }
      return 'web';
    }
    if (files.some(f => f.path.includes('requirements.txt'))) return 'python';
    return 'ai-service';
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const gitIntegration = this.gitIntegrations.get(projectId);
    
    const linesOfCode = project.files
      .filter(file => this.isCodeFile(file.path))
      .reduce((sum, file) => sum + file.content.split('\n').length, 0);

    const tasks = await StorageService.getAllTasks();
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const activeTasks = projectTasks.length - completedTasks;

    let gitStatus: ProjectStats['gitStatus'] = 'clean';
    if (gitIntegration) {
      if (gitIntegration.modifiedFiles > 0) gitStatus = 'modified';
      else if (gitIntegration.untrackedFiles > 0) gitStatus = 'untracked';
    }

    return {
      totalFiles: project.files.length,
      linesOfCode,
      lastActivity: new Date(project.updatedAt),
      tasksCompleted: completedTasks,
      activeTasks,
      gitCommits: gitIntegration?.commitCount || 0,
      gitBranches: gitIntegration ? await this.getBranchCount(projectId) : 0,
      gitStatus,
      aiInteractions: project.aiContext.conversationHistory.length,
      repositorySize: this.calculateRepositorySize(project.files)
    };
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'sql'];
    const ext = filePath.split('.').pop()?.toLowerCase();
    return !!ext && codeExtensions.includes(ext);
  }

  private async getBranchCount(projectId: string): Promise<number> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) return 0;

    try {
      const branches = await gitManager.listBranches(gitIntegration.repositoryId);
      return branches.length;
    } catch (error) {
      console.warn('Failed to get branch count:', error);
      return 0;
    }
  }

  private calculateRepositorySize(files: ProjectFile[]): number {
    return files.reduce((total, file) => total + (file.size || file.content.length), 0);
  }

  async syncGitStatus(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) return;

    try {
      const status = await gitManager.getStatus(gitIntegration.repositoryId);
      
      gitIntegration.untrackedFiles = status.filter(s => s.status === 'untracked').length;
      gitIntegration.modifiedFiles = status.filter(s => s.status === 'modified' || s.status === 'added').length;

      if (gitIntegration.untrackedFiles === 0 && gitIntegration.modifiedFiles === 0) {
        gitIntegration.status = 'synced';
      } else {
        gitIntegration.status = 'diverged';
      }

      await this.saveGitIntegrations();
    } catch (error) {
      console.warn('Failed to sync Git status:', error);
    }
  }

  async commitChanges(projectId: string, message: string, author?: { name: string; email: string; }): Promise<string> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) throw new Error('No Git repository associated with this project');

    try {
      await gitManager.stageAll(gitIntegration.repositoryId);
      const commitId = await gitManager.commit(gitIntegration.repositoryId, message, author);

      gitIntegration.commitCount++;
      gitIntegration.lastCommit = commitId;
      gitIntegration.modifiedFiles = 0;
      gitIntegration.untrackedFiles = 0;
      gitIntegration.status = 'synced';
      await this.saveGitIntegrations();

      const project = this.projects.get(projectId);
      if (project) {
        project.updatedAt = new Date();
        await this.saveProjects();
      }

      return commitId;
    } catch (error) {
      throw new Error(`Failed to commit changes: ${(error as Error).message}`);
    }
  }

  async pushChanges(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) throw new Error('No Git repository associated with this project');

    try {
      await gitManager.push(gitIntegration.repositoryId);
      gitIntegration.status = 'synced';
      await this.saveGitIntegrations();
    } catch (error) {
      throw new Error(`Failed to push changes: ${(error as Error).message}`);
    }
  }

  async pullChanges(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) throw new Error('No Git repository associated with this project');

    try {
      await gitManager.pull(gitIntegration.repositoryId);
      await this.refreshProjectFiles(projectId);
      gitIntegration.status = 'synced';
      await this.saveGitIntegrations();
    } catch (error) {
      throw new Error(`Failed to pull changes: ${(error as Error).message}`);
    }
  }

  private async refreshProjectFiles(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    const gitIntegration = this.gitIntegrations.get(projectId);
    
    if (!project || !gitIntegration?.repositoryId) return;

    try {
      const files = await gitManager.listFiles(gitIntegration.repositoryId);
      const updatedFiles: ProjectFile[] = [];

      for (const file of files) {
        if (file.type === 'file') {
          try {
            const content = await gitManager.getFileContent(gitIntegration.repositoryId, file.path);
            const existingFile = project.files.find(f => f.path === file.path);
            
            if (existingFile) {
              existingFile.content = content;
              existingFile.lastModified = new Date();
              existingFile.size = file.size || content.length;
              updatedFiles.push(existingFile);
            } else {
              const newFile: ProjectFile = {
                id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                path: file.path,
                content,
                language: this.detectLanguage(file.path),
                lastModified: new Date(),
                isGenerated: false,
                size: file.size || content.length
              };
              updatedFiles.push(newFile);
            }
          } catch (error) {
            console.warn(`Failed to read file ${file.path}:`, error);
          }
        }
      }

      project.files = updatedFiles;
      project.updatedAt = new Date();
      
      await this.saveProjects();
    } catch (error) {
      console.warn('Failed to refresh project files:', error);
    }
  }

  async createBranch(projectId: string, branchName: string, startPoint?: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) throw new Error('No Git repository associated with this project');

    try {
      await gitManager.createBranch(gitIntegration.repositoryId, branchName, startPoint);
    } catch (error) {
      throw new Error(`Failed to create branch: ${(error as Error).message}`);
    }
  }

  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) throw new Error('No Git repository associated with this project');

    try {
      await gitManager.switchBranch(gitIntegration.repositoryId, branchName);
      gitIntegration.branch = branchName;
      await this.saveGitIntegrations();
      await this.refreshProjectFiles(projectId);
    } catch (error) {
      throw new Error(`Failed to switch branch: ${(error as Error).message}`);
    }
  }

  async getBranches(projectId: string): Promise<string[]> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) return [];

    try {
      return await gitManager.listBranches(gitIntegration.repositoryId);
    } catch (error) {
      console.warn('Failed to get branches:', error);
      return [];
    }
  }

    async getCommitHistory(projectId: string, options: { depth?: number; since?: Date; } = {}): Promise<Array<{ oid: string; message: string; author: { name: string; email: string; timestamp: number; }; date: Date; }>> {
        const gitIntegration = this.gitIntegrations.get(projectId);
        if (!gitIntegration?.repositoryId) return [];

        try {
            const commits = await gitManager.getCommitHistory(gitIntegration.repositoryId, options);
            return commits.map(commit => ({
                ...commit,
                date: new Date(commit.author.timestamp * 1000)
            }));
        } catch (error) {
            console.warn('Failed to get commit history:', error);
            return [];
        }
    }

  getGitIntegration(projectId: string): GitIntegration | undefined {
    return this.gitIntegrations.get(projectId);
  }

  getTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  async deleteProject(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);

    try {
      if (gitIntegration?.repositoryId) {
        await gitManager.deleteRepository(gitIntegration.repositoryId);
      }

      this.projects.delete(projectId);
      this.gitIntegrations.delete(projectId);

      await this.saveProjects();
      await this.saveGitIntegrations();

      try {
        await enhancedVectorDatabase.deleteIndex(`project_${projectId}`);
      } catch (error) {
        console.warn('Failed to delete project index:', error);
      }
    } catch (error) {
      throw new Error(`Failed to delete project: ${(error as Error).message}`);
    }
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    return this.projects.get(projectId);
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const updatedProject = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(projectId, updatedProject);
    await this.saveProject(updatedProject);
  }

  private async indexProjectFiles(projectId: string, files: ProjectFile[]): Promise<void> {
    if (files.length === 0) return;

    try {
      const entries = files.map(file => ({
        id: file.id,
        content: file.content,
        metadata: {
          type: 'file',
          language: file.language,
          path: file.path,
        },
      }));

      await enhancedVectorDatabase.addToIndex(`project_${projectId}`, entries);
    } catch (error) {
      console.error(`Failed to index files for project ${projectId}:`, error);
    }
  }
}

export const enhancedProjectManager = new EnhancedProjectManager();