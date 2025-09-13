import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedProjectManager } from './enhancedProjectManager';
import { gitManager } from './gitManager';

interface DeploymentPlatform {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'server' | 'container' | 'function';
  features: string[];
  pricing: {
    free: boolean;
    limits: string;
  };
  config: {
    apiEndpoint?: string;
    authType: 'token' | 'oauth' | 'none';
    requiredFields: string[];
  };
}

interface DeploymentConfig {
  id: string;
  projectId: string;
  platformId: string;
  name: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  lastDeployed?: Date;
  deploymentUrl?: string;
  status: 'configured' | 'deploying' | 'deployed' | 'failed';
}

interface Deployment {
  id: string;
  configId: string;
  projectId: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
  commitHash?: string;
  branch: string;
  startTime: Date;
  endTime?: Date;
  logs: string[];
  url?: string;
  environment: 'production' | 'staging' | 'development';
  metrics?: {
    buildTime: number;
    deployTime: number;
    bundleSize?: number;
  };
}

interface CIPipeline {
  id: string;
  projectId: string;
  name: string;
  trigger: 'push' | 'pull_request' | 'manual' | 'schedule';
  branch: string;
  steps: PipelineStep[];
  isActive: boolean;
  lastRun?: Date;
  status: 'idle' | 'running' | 'success' | 'failed';
}

interface PipelineStep {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'custom';
  command: string;
  timeout: number;
  onFailure: 'continue' | 'stop';
}

class DeploymentManager {
  private platforms: Map<string, DeploymentPlatform> = new Map();
  private configs: Map<string, DeploymentConfig> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private pipelines: Map<string, CIPipeline> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await this.loadPlatforms();
      await this.loadConfigs();
      await this.loadDeployments();
      await this.loadPipelines();
      
      this.isInitialized = true;
      console.log('Deployment manager initialized');
    } catch (error) {
      console.error('Failed to initialize deployment manager:', error);
      throw error;
    }
  }

  private async loadPlatforms(): Promise<void> {
    // Define supported deployment platforms
    const platforms: DeploymentPlatform[] = [
      {
        id: 'vercel',
        name: 'Vercel',
        description: 'Serverless deployment platform for modern web apps',
        type: 'static',
        features: ['Automatic HTTPS', 'CDN', 'Serverless Functions', 'Analytics'],
        pricing: { free: true, limits: '100GB bandwidth, 6 serverless functions' },
        config: {
          apiEndpoint: 'https://api.vercel.com',
          authType: 'token',
          requiredFields: ['accessToken', 'projectId']
        }
      },
      {
        id: 'netlify',
        name: 'Netlify',
        description: 'All-in-one platform for automating modern web projects',
        type: 'static',
        features: ['Continuous Deployment', 'Form Handling', 'Identity', 'Functions'],
        pricing: { free: true, limits: '100GB bandwidth, 300 build minutes' },
        config: {
          apiEndpoint: 'https://api.netlify.com',
          authType: 'token',
          requiredFields: ['accessToken', 'siteId']
        }
      },
      {
        id: 'github-pages',
        name: 'GitHub Pages',
        description: 'Static site hosting directly from your GitHub repository',
        type: 'static',
        features: ['Free hosting', 'Custom domains', 'HTTPS', 'Jekyll support'],
        pricing: { free: true, limits: 'Unlimited public repositories, 1GB storage' },
        config: {
          authType: 'token',
          requiredFields: ['accessToken', 'repository', 'branch']
        }
      },
      {
        id: 'heroku',
        name: 'Heroku',
        description: 'Platform as a service for deploying and running applications',
        type: 'server',
        features: ['Add-ons', 'Dynos', 'Data Clips', 'Pipeline Promotion'],
        pricing: { free: true, limits: '550 free dyno hours, 10GB data' },
        config: {
          apiEndpoint: 'https://api.heroku.com',
          authType: 'token',
          requiredFields: ['apiKey', 'appName']
        }
      },
      {
        id: 'railway',
        name: 'Railway',
        description: 'Infrastructure platform for developing, shipping, and monitoring applications',
        type: 'server',
        features: ['Environments', 'Variables', 'Metrics', 'Logs'],
        pricing: { free: true, limits: '$5/month credit, 500 hours/month' },
        config: {
          apiEndpoint: 'https://backboard.railway.app',
          authType: 'token',
          requiredFields: ['token', 'projectId']
        }
      },
      {
        id: 'render',
        name: 'Render',
        description: 'Unified cloud to build and run all your apps and websites',
        type: 'server',
        features: ['Auto-deploys', 'SSL', 'Private Networks', 'PostgreSQL'],
        pricing: { free: true, limits: '750 hours/month, 512MB RAM' },
        config: {
          apiEndpoint: 'https://api.render.com/v1',
          authType: 'token',
          requiredFields: ['apiKey', 'serviceId']
        }
      }
    ];

    for (const platform of platforms) {
      this.platforms.set(platform.id, platform);
    }
  }

  private async loadConfigs(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('deployment_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        for (const config of configs) {
          config.createdAt = new Date(config.createdAt);
          if (config.lastDeployed) {
            config.lastDeployed = new Date(config.lastDeployed);
          }
          this.configs.set(config.id, config);
        }
      }
    } catch (error) {
      console.error('Failed to load deployment configs:', error);
    }
  }

  private async loadDeployments(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('deployments');
      if (stored) {
        const deployments = JSON.parse(stored);
        for (const deployment of deployments) {
          deployment.startTime = new Date(deployment.startTime);
          if (deployment.endTime) {
            deployment.endTime = new Date(deployment.endTime);
          }
          this.deployments.set(deployment.id, deployment);
        }
      }
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  }

  private async loadPipelines(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ci_pipelines');
      if (stored) {
        const pipelines = JSON.parse(stored);
        for (const pipeline of pipelines) {
          if (pipeline.lastRun) {
            pipeline.lastRun = new Date(pipeline.lastRun);
          }
          this.pipelines.set(pipeline.id, pipeline);
        }
      }
    } catch (error) {
      console.error('Failed to load CI pipelines:', error);
    }
  }

  private async saveConfigs(): Promise<void> {
    try {
      const configs = Array.from(this.configs.values());
      await AsyncStorage.setItem('deployment_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save deployment configs:', error);
    }
  }

  private async saveDeployments(): Promise<void> {
    try {
      const deployments = Array.from(this.deployments.values());
      await AsyncStorage.setItem('deployments', JSON.stringify(deployments));
    } catch (error) {
      console.error('Failed to save deployments:', error);
    }
  }

  private async savePipelines(): Promise<void> {
    try {
      const pipelines = Array.from(this.pipelines.values());
      await AsyncStorage.setItem('ci_pipelines', JSON.stringify(pipelines));
    } catch (error) {
      console.error('Failed to save CI pipelines:', error);
    }
  }

  getPlatforms(): DeploymentPlatform[] {
    return Array.from(this.platforms.values());
  }

  getPlatform(id: string): DeploymentPlatform | undefined {
    return this.platforms.get(id);
  }

  async createDeploymentConfig(config: {
    projectId: string;
    platformId: string;
    name: string;
    config: Record<string, any>;
  }): Promise<DeploymentConfig> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const platform = this.platforms.get(config.platformId);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Validate required fields
    for (const field of platform.config.requiredFields) {
      if (!config.config[field]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    const deploymentConfig: DeploymentConfig = {
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: config.projectId,
      platformId: config.platformId,
      name: config.name,
      config: config.config,
      isActive: true,
      createdAt: new Date(),
      status: 'configured'
    };

    this.configs.set(deploymentConfig.id, deploymentConfig);
    await this.saveConfigs();

    return deploymentConfig;
  }

  async updateDeploymentConfig(id: string, updates: Partial<DeploymentConfig>): Promise<void> {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error('Deployment config not found');
    }

    const updatedConfig = { ...config, ...updates };
    this.configs.set(id, updatedConfig);
    await this.saveConfigs();
  }

  async deleteDeploymentConfig(id: string): Promise<void> {
    this.configs.delete(id);
    // Also delete associated deployments
    const deploymentsToDelete = Array.from(this.deployments.values())
      .filter(d => d.configId === id)
      .map(d => d.id);
    
    for (const deploymentId of deploymentsToDelete) {
      this.deployments.delete(deploymentId);
    }
    
    await this.saveConfigs();
    await this.saveDeployments();
  }

  async deployProject(configId: string, options: {
    branch?: string;
    commitHash?: string;
    environment?: 'production' | 'staging' | 'development';
  } = {}): Promise<Deployment> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Deployment config not found');
    }

    const platform = this.platforms.get(config.platformId);
    if (!platform) {
      throw new Error('Platform not found');
    }

    const deployment: Deployment = {
      id: `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configId,
      projectId: config.projectId,
      status: 'pending',
      branch: options.branch || 'main',
      startTime: new Date(),
      logs: [],
      environment: options.environment || 'production'
    };

    if (options.commitHash) {
      deployment.commitHash = options.commitHash;
    }

    this.deployments.set(deployment.id, deployment);
    await this.saveDeployments();

    // Start deployment process
    this.executeDeployment(deployment.id).catch(error => {
      console.error('Deployment failed:', error);
    });

    return deployment;
  }

  private async executeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const config = this.configs.get(deployment.configId);
    if (!config) {
      throw new Error('Deployment config not found');
    }

    const platform = this.platforms.get(config.platformId);
    if (!platform) {
      throw new Error('Platform not found');
    }

    try {
      // Update status to building
      deployment.status = 'building';
      deployment.logs.push('Starting deployment process...');
      await this.saveDeployments();

      // Simulate build process
      await this.simulateBuild(deployment);

      // Update status to deploying
      deployment.status = 'deploying';
      deployment.logs.push('Deploying to platform...');
      await this.saveDeployments();

      // Simulate deployment process
      await this.simulateDeploy(deployment, platform, config);

      // Mark as successful
      deployment.status = 'success';
      deployment.endTime = new Date();
      deployment.logs.push('Deployment completed successfully!');
      
      // Update deployment URL
      if (platform.id === 'vercel') {
        deployment.url = `https://${config.config.projectId || 'app'}-vercel.app`;
      } else if (platform.id === 'netlify') {
        deployment.url = `https://${config.config.siteId || 'app'}-netlify.app`;
      } else if (platform.id === 'github-pages') {
        deployment.url = `https://${config.config.repository?.replace('.git', '')}.github.io`;
      }

      // Update config status and last deployed
      config.status = 'deployed';
      config.lastDeployed = deployment.endTime;
      config.deploymentUrl = deployment.url;
      await this.saveConfigs();

      await this.saveDeployments();

      console.log(`✅ Deployment ${deploymentId} completed successfully`);
    } catch (error) {
      // Mark as failed
      deployment.status = 'failed';
      deployment.endTime = new Date();
      deployment.logs.push(`Deployment failed: ${error.message}`);
      
      config.status = 'failed';
      await this.saveConfigs();
      await this.saveDeployments();

      console.error(`❌ Deployment ${deploymentId} failed:`, error);
      throw error;
    }
  }

  private async simulateBuild(deployment: Deployment): Promise<void> {
    const buildSteps = [
      'Installing dependencies...',
      'Running build process...',
      'Optimizing assets...',
      'Generating build artifacts...'
    ];

    for (const step of buildSteps) {
      deployment.logs.push(step);
      await this.saveDeployments();
      await this.delay(1000 + Math.random() * 2000); // Simulate processing time
    }
  }

  private async simulateDeploy(deployment: Deployment, platform: DeploymentPlatform, config: DeploymentConfig): Promise<void> {
    const deploySteps = [
      'Connecting to deployment platform...',
      'Uploading build artifacts...',
      'Configuring environment...',
      'Deploying to production...',
      'Running health checks...'
    ];

    for (const step of deploySteps) {
      deployment.logs.push(step);
      await this.saveDeployments();
      await this.delay(1500 + Math.random() * 3000); // Simulate processing time
    }

    // Set deployment metrics
    deployment.metrics = {
      buildTime: Math.floor(Math.random() * 120000) + 30000, // 30-150 seconds
      deployTime: Math.floor(Math.random() * 60000) + 10000, // 10-70 seconds
      bundleSize: Math.floor(Math.random() * 10000000) + 1000000 // 1-10 MB
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getDeployments(projectId?: string): Promise<Deployment[]> {
    const deployments = Array.from(this.deployments.values());
    if (projectId) {
      return deployments.filter(d => d.projectId === projectId);
    }
    return deployments;
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }

  async getDeploymentConfigs(projectId?: string): Promise<DeploymentConfig[]> {
    const configs = Array.from(this.configs.values());
    if (projectId) {
      return configs.filter(c => c.projectId === projectId);
    }
    return configs;
  }

  async createCIPipeline(pipeline: {
    projectId: string;
    name: string;
    trigger: 'push' | 'pull_request' | 'manual' | 'schedule';
    branch: string;
    steps: PipelineStep[];
  }): Promise<CIPipeline> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const ciPipeline: CIPipeline = {
      id: `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: pipeline.projectId,
      name: pipeline.name,
      trigger: pipeline.trigger,
      branch: pipeline.branch,
      steps: pipeline.steps,
      isActive: true,
      status: 'idle'
    };

    this.pipelines.set(ciPipeline.id, ciPipeline);
    await this.savePipelines();

    return ciPipeline;
  }

  async runCIPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error('CI pipeline not found');
    }

    if (!pipeline.isActive) {
      throw new Error('Pipeline is not active');
    }

    pipeline.status = 'running';
    pipeline.lastRun = new Date();
    await this.savePipelines();

    try {
      for (const step of pipeline.steps) {
        console.log(`Running step: ${step.name}`);
        // Simulate step execution
        await this.delay(step.timeout);
      }

      pipeline.status = 'success';
      console.log(`✅ Pipeline ${pipelineId} completed successfully`);
    } catch (error) {
      pipeline.status = 'failed';
      console.error(`❌ Pipeline ${pipelineId} failed:`, error);
      throw error;
    } finally {
      await this.savePipelines();
    }
  }

  async getCIPipelines(projectId?: string): Promise<CIPipeline[]> {
    const pipelines = Array.from(this.pipelines.values());
    if (projectId) {
      return pipelines.filter(p => p.projectId === projectId);
    }
    return pipelines;
  }

  async getDeploymentStats(projectId?: string): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageBuildTime: number;
    averageDeployTime: number;
    lastDeployment?: Date;
    platforms: Array<{
      platformId: string;
      platformName: string;
      deploymentCount: number;
    }>;
  }> {
    const deployments = projectId 
      ? Array.from(this.deployments.values()).filter(d => d.projectId === projectId)
      : Array.from(this.deployments.values());

    const successful = deployments.filter(d => d.status === 'success');
    const failed = deployments.filter(d => d.status === 'failed');

    const totalBuildTime = deployments
      .filter(d => d.metrics?.buildTime)
      .reduce((sum, d) => sum + (d.metrics?.buildTime || 0), 0);
    
    const totalDeployTime = deployments
      .filter(d => d.metrics?.deployTime)
      .reduce((sum, d) => sum + (d.metrics?.deployTime || 0), 0);

    const platformStats = new Map<string, { platformId: string; platformName: string; deploymentCount: number }>();
    
    for (const deployment of deployments) {
      const config = this.configs.get(deployment.configId);
      if (config) {
        const platform = this.platforms.get(config.platformId);
        if (platform) {
          const existing = platformStats.get(platform.id);
          if (existing) {
            existing.deploymentCount++;
          } else {
            platformStats.set(platform.id, {
              platformId: platform.id,
              platformName: platform.name,
              deploymentCount: 1
            });
          }
        }
      }
    }

    return {
      totalDeployments: deployments.length,
      successfulDeployments: successful.length,
      failedDeployments: failed.length,
      averageBuildTime: successful.length > 0 ? totalBuildTime / successful.length : 0,
      averageDeployTime: successful.length > 0 ? totalDeployTime / successful.length : 0,
      lastDeployment: deployments.length > 0 ? 
        new Date(Math.max(...deployments.map(d => d.startTime.getTime()))) : undefined,
      platforms: Array.from(platformStats.values())
    };
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status === 'success' || deployment.status === 'failed') {
      throw new Error('Deployment already completed');
    }

    deployment.status = 'failed';
    deployment.endTime = new Date();
    deployment.logs.push('Deployment cancelled by user');
    
    await this.saveDeployments();
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    return deployment.logs;
  }
}

export const deploymentManager = new DeploymentManager();