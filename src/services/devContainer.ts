import { db } from '../database/schema';
import type { Project, FileEntry } from '../database/schema';

export interface BuildResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  artifacts: string[];
  duration: number;
}

export interface TerminalCommand {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export class DevContainerService {
  private workers: Map<string, Worker> = new Map();
  private buildCache: Map<string, BuildResult> = new Map();
  private fileSystem: Map<string, string> = new Map(); // Virtual filesystem

  // Filesystem operations
  async mountProject(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const files = await db.files.where('projectId').equals(projectId).toArray();
    
    // Mount files into virtual filesystem
    for (const file of files) {
      this.fileSystem.set(`/workspace/${project.name}/${file.path}`, file.content);
    }
  }

  async readFile(path: string): Promise<string> {
    const content = this.fileSystem.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.fileSystem.set(path, content);
    
    // Extract project info from path
    const pathParts = path.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'workspace') {
      const projectName = pathParts[2];
      const relativePath = pathParts.slice(3).join('/');
      
      // Update database
      const project = await db.projects.where('name').equals(projectName).first();
      if (project) {
        await this.updateFileInDatabase(project.id, relativePath, content);
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    this.fileSystem.delete(path);
  }

  async listFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const [path] of this.fileSystem) {
      if (path.startsWith(directory) && path !== directory) {
        const relativePath = path.substring(directory.length + 1);
        if (!relativePath.includes('/')) {
          files.push(relativePath);
        }
      }
    }
    return files;
  }

  // Build pipeline
  async buildProject(projectId: string, target?: string): Promise<BuildResult> {
    const startTime = Date.now();
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      // Check cache first
      const cacheKey = `${projectId}_${target || 'default'}`;
      const cachedResult = this.buildCache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult;
      }

      // Determine build type based on project files
      const buildType = await this.detectBuildType(projectId);
      let result: BuildResult;

      switch (buildType) {
        case 'react':
          result = await this.buildReactProject(projectId);
          break;
        case 'node':
          result = await this.buildNodeProject(projectId);
          break;
        case 'static':
          result = await this.buildStaticProject(projectId);
          break;
        default:
          result = await this.buildGenericProject(projectId);
      }

      result.duration = Date.now() - startTime;
      
      // Cache successful builds
      if (result.success) {
        this.buildCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [error.message],
        warnings: [],
        artifacts: [],
        duration: Date.now() - startTime
      };
    }
  }

  private async detectBuildType(projectId: string): Promise<string> {
    const files = await db.files.where('projectId').equals(projectId).toArray();
    
    const hasPackageJson = files.some(f => f.path === 'package.json');
    const hasReactDeps = files.some(f => {
      if (f.path === 'package.json') {
        try {
          const pkg = JSON.parse(f.content);
          return pkg.dependencies?.react || pkg.devDependencies?.react;
        } catch {
          return false;
        }
      }
      return false;
    });

    if (hasPackageJson && hasReactDeps) return 'react';
    if (hasPackageJson) return 'node';
    
    const hasHtml = files.some(f => f.path.endsWith('.html'));
    if (hasHtml) return 'static';
    
    return 'generic';
  }

  private async buildReactProject(projectId: string): Promise<BuildResult> {
    const worker = await this.getOrCreateWorker('esbuild');
    
    return new Promise((resolve) => {
      worker.postMessage({
        type: 'build_react',
        projectId,
        config: {
          entryPoints: ['src/index.tsx', 'src/index.ts', 'src/main.tsx'],
          outdir: 'dist',
          bundle: true,
          minify: true,
          sourcemap: true,
          format: 'esm',
          target: 'es2020'
        }
      });

      worker.onmessage = (event) => {
        if (event.data.type === 'build_complete') {
          resolve(event.data.result);
        }
      };
    });
  }

  private async buildNodeProject(projectId: string): Promise<BuildResult> {
    const worker = await this.getOrCreateWorker('esbuild');
    
    return new Promise((resolve) => {
      worker.postMessage({
        type: 'build_node',
        projectId,
        config: {
          entryPoints: ['src/index.ts', 'index.js', 'server.js'],
          outdir: 'dist',
          bundle: true,
          platform: 'node',
          format: 'cjs',
          target: 'node16'
        }
      });

      worker.onmessage = (event) => {
        if (event.data.type === 'build_complete') {
          resolve(event.data.result);
        }
      };
    });
  }

  private async buildStaticProject(projectId: string): Promise<BuildResult> {
    // Simple static build - just copy files
    const files = await db.files.where('projectId').equals(projectId).toArray();
    const artifacts: string[] = [];

    for (const file of files) {
      if (file.type === 'file') {
        artifacts.push(`dist/${file.path}`);
        this.fileSystem.set(`/build/${projectId}/dist/${file.path}`, file.content);
      }
    }

    return {
      success: true,
      output: `Built ${artifacts.length} static files`,
      errors: [],
      warnings: [],
      artifacts,
      duration: 0
    };
  }

  private async buildGenericProject(projectId: string): Promise<BuildResult> {
    return {
      success: true,
      output: 'Generic build completed',
      errors: [],
      warnings: [],
      artifacts: [],
      duration: 0
    };
  }

  private async getOrCreateWorker(type: string): Promise<Worker> {
    if (!this.workers.has(type)) {
      const worker = new Worker(new URL('../workers/buildWorker.ts', import.meta.url), {
        type: 'module'
      });
      this.workers.set(type, worker);
    }
    return this.workers.get(type)!;
  }

  private isCacheValid(result: BuildResult): boolean {
    // Cache is valid for 5 minutes
    return Date.now() - result.duration < 5 * 60 * 1000;
  }

  // Terminal emulation
  async executeCommand(projectId: string, command: TerminalCommand): Promise<{ output: string; exitCode: number }> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    // Mock command execution
    const mockCommands = {
      'ls': () => this.mockLs(command.cwd),
      'pwd': () => ({ output: command.cwd, exitCode: 0 }),
      'cat': () => this.mockCat(command.args[0]),
      'echo': () => ({ output: command.args.join(' '), exitCode: 0 }),
      'git': () => this.mockGit(command.args),
      'npm': () => this.mockNpm(projectId, command.args),
      'node': () => this.mockNode(projectId, command.args)
    };

    const handler = mockCommands[command.command];
    if (handler) {
      return handler();
    }

    return {
      output: `Command not found: ${command.command}`,
      exitCode: 127
    };
  }

  private async mockLs(cwd: string): Promise<{ output: string; exitCode: number }> {
    try {
      const files = await this.listFiles(cwd);
      return {
        output: files.join('\n'),
        exitCode: 0
      };
    } catch {
      return {
        output: 'ls: cannot access directory',
        exitCode: 1
      };
    }
  }

  private async mockCat(filepath: string): Promise<{ output: string; exitCode: number }> {
    try {
      const content = await this.readFile(filepath);
      return {
        output: content,
        exitCode: 0
      };
    } catch {
      return {
        output: `cat: ${filepath}: No such file or directory`,
        exitCode: 1
      };
    }
  }

  private mockGit(args: string[]): { output: string; exitCode: number } {
    const subcommand = args[0];
    
    switch (subcommand) {
      case 'status':
        return {
          output: 'On branch main\nnothing to commit, working tree clean',
          exitCode: 0
        };
      case 'log':
        return {
          output: 'commit abc123 (HEAD -> main)\nAuthor: AI Dev Workspace\nDate: ' + new Date().toISOString() + '\n\n    Initial commit',
          exitCode: 0
        };
      case 'branch':
        return {
          output: '* main',
          exitCode: 0
        };
      default:
        return {
          output: `git: '${subcommand}' is not a git command`,
          exitCode: 1
        };
    }
  }

  private async mockNpm(projectId: string, args: string[]): Promise<{ output: string; exitCode: number }> {
    const subcommand = args[0];
    
    switch (subcommand) {
      case 'install':
        return {
          output: 'npm install completed successfully',
          exitCode: 0
        };
      case 'build':
        const buildResult = await this.buildProject(projectId);
        return {
          output: buildResult.output,
          exitCode: buildResult.success ? 0 : 1
        };
      case 'start':
        return {
          output: 'Development server started on http://localhost:3000',
          exitCode: 0
        };
      case 'test':
        return {
          output: 'Tests passed: 0/0',
          exitCode: 0
        };
      default:
        return {
          output: `npm: unknown command '${subcommand}'`,
          exitCode: 1
        };
    }
  }

  private mockNode(projectId: string, args: string[]): { output: string; exitCode: number } {
    const filename = args[0];
    if (!filename) {
      return {
        output: 'Node.js REPL not implemented',
        exitCode: 1
      };
    }

    return {
      output: `Executing ${filename}...\nHello from Node.js!`,
      exitCode: 0
    };
  }

  // Preview server
  async startPreviewServer(projectId: string): Promise<{ url: string; port: number }> {
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    // Build project first
    const buildResult = await this.buildProject(projectId);
    if (!buildResult.success) {
      throw new Error('Build failed: ' + buildResult.errors.join(', '));
    }

    // Register service worker route for preview
    const port = 3000 + Math.floor(Math.random() * 1000);
    const url = `http://localhost:${port}`;

    // In a real implementation, this would set up service worker routes
    // For now, we just return the URL
    return { url, port };
  }

  async stopPreviewServer(projectId: string): Promise<void> {
    // Stop the preview server
    console.log('Stopping preview server for project:', projectId);
  }

  // File watching and hot reload
  async enableHotReload(projectId: string): Promise<void> {
    // Set up file watching for hot reload
    const files = await db.files.where('projectId').equals(projectId).toArray();
    
    for (const file of files) {
      this.watchFile(projectId, file.path);
    }
  }

  private watchFile(projectId: string, filepath: string): void {
    // In a real implementation, this would set up file watching
    // and trigger rebuilds on changes
    console.log('Watching file:', filepath);
  }

  // Diagnostics
  async getDiagnostics(projectId: string): Promise<Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>> {
    const files = await db.files.where('projectId').equals(projectId).toArray();
    const diagnostics: any[] = [];

    for (const file of files) {
      if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
        // Simple TypeScript-like diagnostics
        const lines = file.content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('console.log')) {
            diagnostics.push({
              file: file.path,
              line: index + 1,
              column: line.indexOf('console.log') + 1,
              severity: 'warning',
              message: 'console.log statements should be removed in production'
            });
          }
          if (line.includes('any')) {
            diagnostics.push({
              file: file.path,
              line: index + 1,
              column: line.indexOf('any') + 1,
              severity: 'warning',
              message: 'Avoid using "any" type'
            });
          }
        });
      }
    }

    return diagnostics;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Terminate all workers
    for (const [, worker] of this.workers) {
      worker.terminate();
    }
    this.workers.clear();
    
    // Clear caches
    this.buildCache.clear();
    this.fileSystem.clear();
  }

  private async updateFileInDatabase(projectId: string, path: string, content: string): Promise<void> {
    const existing = await db.files.where({ projectId, path }).first();
    
    if (existing) {
      await db.files.update(existing.id, {
        content,
        size: content.length,
        lastModified: new Date(),
        isDirty: true
      });
    } else {
      const newFile: FileEntry = {
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
      };
      
      await db.files.add(newFile);
    }
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const devContainer = new DevContainerService();