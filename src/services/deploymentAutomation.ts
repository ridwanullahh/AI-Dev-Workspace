import { db } from '../database/schema';
import { devContainer } from './devContainer';
import { gitCore } from './gitCore';
import type { Project } from '../database/schema';

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'github-pages' | 'netlify' | 'vercel' | 'static';
  config: Record<string, any>;
  isActive: boolean;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  logs: string[];
  errors: string[];
  duration: number;
  deploymentId: string;
}

export interface DeploymentHistory {
  id: string;
  projectId: string;
  targetId: string;
  status: 'pending' | 'building' | 'deployed' | 'failed' | 'rolled-back';
  url?: string;
  commit: string;
  branch: string;
  logs: string[];
  startedAt: Date;
  completedAt?: Date;
  rollbackId?: string;
}

export class DeploymentAutomationService {
  private deploymentQueue: Map<string, DeploymentHistory> = new Map();
  private errorFixStrategies: Map<string, (error: string) => Promise<string[]>> = new Map();

  constructor() {
    this.initializeErrorFixStrategies();
  }

  private initializeErrorFixStrategies() {
    this.errorFixStrategies.set('build-failed', async (error: string) => {
      const fixes: string[] = [];
      
      if (error.includes('Module not found')) {
        fixes.push('Run npm install to install missing dependencies');
        fixes.push('Check import paths for typos');
        fixes.push('Verify package.json dependencies');
      }
      
      if (error.includes('TypeScript error')) {
        fixes.push('Fix TypeScript compilation errors');
        fixes.push('Update tsconfig.json configuration');
        fixes.push('Install missing type definitions');
      }
      
      if (error.includes('out of memory')) {
        fixes.push('Increase Node.js memory limit');
        fixes.push('Optimize bundle size');
        fixes.push('Enable code splitting');
      }
      
      return fixes;
    });

    this.errorFixStrategies.set('deployment-failed', async (error: string) => {
      const fixes: string[] = [];
      
      if (error.includes('permission denied')) {
        fixes.push('Check deployment credentials');
        fixes.push('Verify repository permissions');
        fixes.push('Update access tokens');
      }
      
      if (error.includes('quota exceeded')) {
        fixes.push('Check deployment quota limits');
        fixes.push('Clean up old deployments');
        fixes.push('Upgrade deployment plan');
      }
      
      return fixes;
    });
  }

  // Target Management
  async addDeploymentTarget(projectId: string, target: Omit<DeploymentTarget, 'id'>): Promise<DeploymentTarget> {
    const deploymentTarget: DeploymentTarget = {
      id: `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...target
    };

    await db.settings.put({
      id: `deployment_target_${deploymentTarget.id}`,
      category: 'deployment',
      key: `target_${projectId}`,
      value: deploymentTarget,
      encrypted: false,
      updatedAt: new Date()
    });

    return deploymentTarget;
  }

  async getDeploymentTargets(projectId: string): Promise<DeploymentTarget[]> {
    const settings = await db.settings
      .where('category').equals('deployment')
      .and(setting => setting.key.startsWith(`target_${projectId}`))
      .toArray();

    return settings.map(setting => setting.value as DeploymentTarget);
  }

  // Deployment Operations
  async deployProject(
    projectId: string, 
    targetId: string, 
    branch: string = 'main'
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const project = await db.projects.get(projectId);
    if (!project) throw new Error('Project not found');

    const targets = await this.getDeploymentTargets(projectId);
    const target = targets.find(t => t.id === targetId);
    if (!target) throw new Error('Deployment target not found');

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const deployment: DeploymentHistory = {
      id: deploymentId,
      projectId,
      targetId,
      status: 'pending',
      commit: 'latest', // Would get actual commit hash
      branch,
      logs: [],
      startedAt: new Date()
    };

    this.deploymentQueue.set(deploymentId, deployment);

    try {
      // Update status to building
      deployment.status = 'building';
      deployment.logs.push('Starting deployment process...');

      // Build project
      deployment.logs.push('Building project...');
      const buildResult = await devContainer.buildProject(projectId);
      
      if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.errors.join(', ')}`);
      }

      deployment.logs.push('Build completed successfully');
      deployment.logs.push(`Generated ${buildResult.artifacts.length} artifacts`);

      // Deploy based on target type
      let deployResult: DeploymentResult;
      
      switch (target.type) {
        case 'github-pages':
          deployResult = await this.deployToGitHubPages(project, target, deployment);
          break;
        case 'netlify':
          deployResult = await this.deployToNetlify(project, target, deployment);
          break;
        case 'vercel':
          deployResult = await this.deployToVercel(project, target, deployment);
          break;
        case 'static':
          deployResult = await this.deployStatic(project, target, deployment);
          break;
        default:
          throw new Error(`Unsupported deployment target: ${target.type}`);
      }

      deployment.status = 'deployed';
      deployment.url = deployResult.url;
      deployment.completedAt = new Date();
      deployment.logs.push(...deployResult.logs);

      await this.saveDeploymentHistory(deployment);

      return {
        ...deployResult,
        duration: Date.now() - startTime,
        deploymentId
      };

    } catch (error) {
      deployment.status = 'failed';
      deployment.completedAt = new Date();
      deployment.logs.push(`Deployment failed: ${error.message}`);

      await this.saveDeploymentHistory(deployment);

      // Auto-fix attempt
      const fixes = await this.attemptAutoFix(error.message, deployment);
      if (fixes.length > 0) {
        deployment.logs.push('Auto-fix suggestions generated');
        deployment.logs.push(...fixes.map(fix => `- ${fix}`));
      }

      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  private async deployToGitHubPages(
    project: Project, 
    target: DeploymentTarget, 
    deployment: DeploymentHistory
  ): Promise<DeploymentResult> {
    deployment.logs.push('Deploying to GitHub Pages...');
    
    try {
      // Simulate GitHub Pages deployment
      const repoName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const username = target.config.username || 'user';
      const url = `https://${username}.github.io/${repoName}`;

      deployment.logs.push('Pushing to gh-pages branch...');
      deployment.logs.push('GitHub Pages deployment initiated...');
      deployment.logs.push('Waiting for deployment to complete...');

      // Simulate deployment time
      await new Promise(resolve => setTimeout(resolve, 3000));

      deployment.logs.push('GitHub Pages deployment completed successfully');

      return {
        success: true,
        url,
        logs: [`Deployed to GitHub Pages: ${url}`],
        errors: [],
        duration: 0,
        deploymentId: deployment.id
      };
    } catch (error) {
      throw new Error(`GitHub Pages deployment failed: ${error.message}`);
    }
  }

  private async deployToNetlify(
    project: Project, 
    target: DeploymentTarget, 
    deployment: DeploymentHistory
  ): Promise<DeploymentResult> {
    deployment.logs.push('Deploying to Netlify...');

    try {
      // Simulate Netlify deployment
      const siteId = target.config.siteId || `${project.name}-${Date.now()}`;
      const url = `https://${siteId}.netlify.app`;

      deployment.logs.push('Uploading build artifacts to Netlify...');
      deployment.logs.push('Processing deployment...');

      // Simulate deployment time
      await new Promise(resolve => setTimeout(resolve, 2000));

      deployment.logs.push('Netlify deployment completed successfully');

      return {
        success: true,
        url,
        logs: [`Deployed to Netlify: ${url}`],
        errors: [],
        duration: 0,
        deploymentId: deployment.id
      };
    } catch (error) {
      throw new Error(`Netlify deployment failed: ${error.message}`);
    }
  }

  private async deployToVercel(
    project: Project, 
    target: DeploymentTarget, 
    deployment: DeploymentHistory
  ): Promise<DeploymentResult> {
    deployment.logs.push('Deploying to Vercel...');

    try {
      // Simulate Vercel deployment
      const projectName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const url = `https://${projectName}.vercel.app`;

      deployment.logs.push('Creating Vercel deployment...');
      deployment.logs.push('Building on Vercel infrastructure...');

      // Simulate deployment time
      await new Promise(resolve => setTimeout(resolve, 4000));

      deployment.logs.push('Vercel deployment completed successfully');

      return {
        success: true,
        url,
        logs: [`Deployed to Vercel: ${url}`],
        errors: [],
        duration: 0,
        deploymentId: deployment.id
      };
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  private async deployStatic(
    project: Project, 
    target: DeploymentTarget, 
    deployment: DeploymentHistory
  ): Promise<DeploymentResult> {
    deployment.logs.push('Preparing static deployment...');

    try {
      // Simulate static file deployment
      const url = target.config.baseUrl || `https://static-${project.name}.example.com`;

      deployment.logs.push('Copying static files...');
      deployment.logs.push('Updating static site configuration...');

      deployment.logs.push('Static deployment completed successfully');

      return {
        success: true,
        url,
        logs: [`Static site deployed: ${url}`],
        errors: [],
        duration: 0,
        deploymentId: deployment.id
      };
    } catch (error) {
      throw new Error(`Static deployment failed: ${error.message}`);
    }
  }

  // Auto-fix functionality
  private async attemptAutoFix(error: string, deployment: DeploymentHistory): Promise<string[]> {
    const fixes: string[] = [];

    // Try different fix strategies
    for (const [errorType, strategy] of this.errorFixStrategies) {
      if (this.errorMatches(error, errorType)) {
        const suggestions = await strategy(error);
        fixes.push(...suggestions);
      }
    }

    // Auto-apply simple fixes
    if (error.includes('missing package.json')) {
      fixes.push('Creating package.json file...');
      await this.createPackageJson(deployment.projectId);
    }

    if (error.includes('missing index.html')) {
      fixes.push('Creating index.html file...');
      await this.createIndexHtml(deployment.projectId);
    }

    return fixes;
  }

  private errorMatches(error: string, errorType: string): boolean {
    const patterns = {
      'build-failed': ['build', 'compile', 'syntax', 'module'],
      'deployment-failed': ['deploy', 'upload', 'permission', 'quota', 'network']
    };

    const errorPatterns = patterns[errorType] || [];
    return errorPatterns.some(pattern => error.toLowerCase().includes(pattern));
  }

  private async createPackageJson(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) return;

    const packageJson = {
      name: project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      version: '1.0.0',
      description: project.description,
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        build: 'echo "Build script not configured"',
        test: 'echo "No tests configured"'
      },
      dependencies: {},
      devDependencies: {}
    };

    await devContainer.writeFile(
      `/workspace/${project.name}/package.json`,
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async createIndexHtml(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (!project) return;

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
</head>
<body>
    <h1>Welcome to ${project.name}</h1>
    <p>${project.description}</p>
</body>
</html>`;

    await devContainer.writeFile(
      `/workspace/${project.name}/index.html`,
      indexHtml
    );
  }

  // Rollback functionality
  async rollbackDeployment(deploymentId: string): Promise<DeploymentResult> {
    const deployment = this.deploymentQueue.get(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    try {
      deployment.logs.push('Initiating rollback...');
      
      // Find previous successful deployment
      const previousDeployment = await this.getPreviousSuccessfulDeployment(
        deployment.projectId, 
        deployment.targetId
      );

      if (!previousDeployment) {
        throw new Error('No previous deployment found for rollback');
      }

      deployment.logs.push(`Rolling back to deployment: ${previousDeployment.id}`);
      
      // Simulate rollback process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      deployment.status = 'rolled-back';
      deployment.rollbackId = previousDeployment.id;
      deployment.completedAt = new Date();
      deployment.logs.push('Rollback completed successfully');

      await this.saveDeploymentHistory(deployment);

      return {
        success: true,
        url: previousDeployment.url,
        logs: deployment.logs,
        errors: [],
        duration: 0,
        deploymentId
      };
    } catch (error) {
      deployment.logs.push(`Rollback failed: ${error.message}`);
      throw error;
    }
  }

  // History and monitoring
  async getDeploymentHistory(projectId: string): Promise<DeploymentHistory[]> {
    const settings = await db.settings
      .where('category').equals('deployment')
      .and(setting => setting.key.startsWith(`history_${projectId}`))
      .toArray();

    return settings.map(setting => setting.value as DeploymentHistory)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentHistory | null> {
    return this.deploymentQueue.get(deploymentId) || null;
  }

  async getActiveDeployments(): Promise<DeploymentHistory[]> {
    return Array.from(this.deploymentQueue.values())
      .filter(deployment => ['pending', 'building'].includes(deployment.status));
  }

  private async getPreviousSuccessfulDeployment(
    projectId: string, 
    targetId: string
  ): Promise<DeploymentHistory | null> {
    const history = await this.getDeploymentHistory(projectId);
    return history.find(d => d.targetId === targetId && d.status === 'deployed') || null;
  }

  private async saveDeploymentHistory(deployment: DeploymentHistory): Promise<void> {
    await db.settings.put({
      id: `deployment_history_${deployment.id}`,
      category: 'deployment',
      key: `history_${deployment.projectId}`,
      value: deployment,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  // Health checks
  async performHealthCheck(deploymentId: string): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
  }> {
    const deployment = this.deploymentQueue.get(deploymentId);
    if (!deployment || !deployment.url) {
      return {
        status: 'down',
        responseTime: 0,
        checks: [{ name: 'deployment', status: 'fail', message: 'Deployment not found or no URL' }]
      };
    }

    const checks = [];
    let responseTime = 0;

    try {
      // Simulate health check
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      responseTime = Date.now() - startTime;

      checks.push({ name: 'http', status: 'pass' as const });
      checks.push({ name: 'ssl', status: 'pass' as const });
      checks.push({ name: 'performance', status: responseTime < 500 ? 'pass' : 'fail' as const });

      const failedChecks = checks.filter(c => c.status === 'fail').length;
      const status = failedChecks === 0 ? 'healthy' : failedChecks === 1 ? 'degraded' : 'down';

      return { status, responseTime, checks };
    } catch (error) {
      return {
        status: 'down',
        responseTime: 0,
        checks: [{ name: 'http', status: 'fail', message: error.message }]
      };
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.deploymentQueue.clear();
  }
}

export const deploymentAutomation = new DeploymentAutomationService();