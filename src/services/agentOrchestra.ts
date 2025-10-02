import { db } from '../database/schema';
import { enhancedAIProvider } from './enhancedAIProvider';
import { gitCore } from './gitCore';
import { enhancedVectorDatabase } from './enhancedVectorDatabase';

export interface Agent {
  id: string;
  name: string;
  role: 'planner' | 'coder' | 'designer' | 'debugger' | 'reviewer' | 'deployer';
  description: string;
  systemPrompt: string;
  tools: string[];
  capabilities: string[];
  isActive: boolean;
  priority: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'analysis' | 'implementation' | 'review' | 'deployment' | 'debugging';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  assignedAgentId?: string;
  dependencies: string[];
  artifacts: TaskArtifact[];
  estimatedDuration: number;
  actualDuration?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TaskArtifact {
  id: string;
  type: 'code' | 'documentation' | 'test' | 'config' | 'plan';
  name: string;
  content: string;
  path?: string;
  metadata: Record<string, any>;
}

export interface WorkflowGraph {
  nodes: Array<{
    id: string;
    type: 'task' | 'agent' | 'decision';
    data: any;
  }>;
  edges: Array<{
    from: string;
    to: string;
    condition?: string;
  }>;
}

export class AgentOrchestraService {
  private agents: Map<string, Agent> = new Map();
  private activeWorkers: Map<string, Worker> = new Map();
  private taskQueue: Task[] = [];
  private executionGraph: WorkflowGraph = { nodes: [], edges: [] };

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    const defaultAgents: Agent[] = [
      {
        id: 'planner-agent',
        name: 'Strategic Planner',
        role: 'planner',
        description: 'Analyzes requirements and creates implementation plans',
        systemPrompt: `You are a strategic planner for software development. Your role is to:
1. Analyze user requirements and break them down into actionable tasks
2. Create detailed implementation plans with clear dependencies
3. Estimate effort and identify potential risks
4. Coordinate with other agents to ensure smooth execution
5. Adapt plans based on feedback and changing requirements

Always provide structured, actionable plans with clear priorities and dependencies.`,
        tools: ['task_decomposition', 'dependency_analysis', 'risk_assessment'],
        capabilities: ['requirement_analysis', 'project_planning', 'resource_allocation'],
        isActive: true,
        priority: 1
      },
      {
        id: 'coder-agent',
        name: 'Senior Developer',
        role: 'coder',
        description: 'Implements features and writes high-quality code',
        systemPrompt: `You are a senior software developer with expertise in multiple programming languages and frameworks. Your responsibilities include:
1. Writing clean, efficient, and maintainable code
2. Following best practices and coding standards
3. Implementing features according to specifications
4. Creating appropriate tests for your code
5. Documenting your implementations

Focus on code quality, performance, and maintainability. Always consider edge cases and error handling.`,
        tools: ['code_generation', 'file_operations', 'git_operations', 'testing'],
        capabilities: ['frontend_development', 'backend_development', 'api_design', 'database_design'],
        isActive: true,
        priority: 2
      },
      {
        id: 'designer-agent',
        name: 'UX/UI Designer',
        role: 'designer',
        description: 'Creates user interfaces and experiences',
        systemPrompt: `You are a UX/UI designer focused on creating excellent user experiences. Your role involves:
1. Designing intuitive and accessible user interfaces
2. Creating responsive layouts that work across devices
3. Ensuring consistent design patterns and branding
4. Optimizing user flows and interactions
5. Considering accessibility and usability principles

Always prioritize user experience and follow modern design principles.`,
        tools: ['ui_generation', 'style_creation', 'accessibility_check'],
        capabilities: ['ui_design', 'ux_design', 'responsive_design', 'accessibility'],
        isActive: true,
        priority: 3
      },
      {
        id: 'debugger-agent',
        name: 'Debug Specialist',
        role: 'debugger',
        description: 'Identifies and fixes bugs and performance issues',
        systemPrompt: `You are a debugging specialist with deep knowledge of troubleshooting and performance optimization. Your expertise includes:
1. Identifying and diagnosing bugs and issues
2. Analyzing error logs and stack traces
3. Performance profiling and optimization
4. Root cause analysis
5. Suggesting preventive measures

Focus on systematic debugging approaches and thorough analysis.`,
        tools: ['error_analysis', 'performance_profiling', 'log_analysis', 'testing'],
        capabilities: ['bug_fixing', 'performance_optimization', 'security_analysis', 'monitoring'],
        isActive: true,
        priority: 4
      },
      {
        id: 'reviewer-agent',
        name: 'Code Reviewer',
        role: 'reviewer',
        description: 'Reviews code quality and suggests improvements',
        systemPrompt: `You are a code reviewer focused on maintaining high code quality standards. Your responsibilities include:
1. Reviewing code for quality, security, and best practices
2. Identifying potential bugs and vulnerabilities
3. Suggesting improvements and optimizations
4. Ensuring consistency with project standards
5. Mentoring through constructive feedback

Provide thorough, constructive reviews that improve code quality and team knowledge.`,
        tools: ['code_analysis', 'security_scan', 'quality_metrics'],
        capabilities: ['code_review', 'security_audit', 'performance_review', 'standards_compliance'],
        isActive: true,
        priority: 5
      },
      {
        id: 'deployer-agent',
        name: 'DevOps Engineer',
        role: 'deployer',
        description: 'Handles deployment and infrastructure management',
        systemPrompt: `You are a DevOps engineer responsible for deployment and infrastructure. Your role includes:
1. Managing deployment pipelines and processes
2. Ensuring secure and reliable deployments
3. Monitoring application health and performance
4. Managing infrastructure and scaling
5. Implementing CI/CD best practices

Focus on reliability, security, and automation in all deployment activities.`,
        tools: ['deployment', 'monitoring', 'infrastructure', 'ci_cd'],
        capabilities: ['deployment_automation', 'infrastructure_management', 'monitoring', 'scaling'],
        isActive: true,
        priority: 6
      }
    ];

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  // Task Management
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'artifacts'>): Promise<Task> {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...taskData,
      status: 'pending',
      artifacts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.taskQueue.push(task);
    await this.saveTaskToDatabase(task);
    
    // Auto-assign to appropriate agent
    await this.assignTaskToAgent(task.id);
    
    return task;
  }

  async assignTaskToAgent(taskId: string): Promise<void> {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    // Find best agent for this task type
    const suitableAgents = Array.from(this.agents.values())
      .filter(agent => agent.isActive && this.canAgentHandleTask(agent, task))
      .sort((a, b) => a.priority - b.priority);

    if (suitableAgents.length === 0) {
      throw new Error('No suitable agent available for this task');
    }

    task.assignedAgentId = suitableAgents[0].id;
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
    await this.executeTask(task);
  }

  private canAgentHandleTask(agent: Agent, task: Task): boolean {
    const taskTypeMapping = {
      'analysis': ['planner', 'reviewer'],
      'implementation': ['coder', 'designer'],
      'review': ['reviewer', 'debugger'],
      'deployment': ['deployer'],
      'debugging': ['debugger', 'coder']
    };

    return taskTypeMapping[task.type]?.includes(agent.role) || false;
  }

  // Task Execution
  async executeTask(task: Task): Promise<void> {
    const agent = this.agents.get(task.assignedAgentId!);
    if (!agent) throw new Error('Assigned agent not found');

    try {
      task.status = 'in_progress';
      task.updatedAt = new Date();
      await this.saveTaskToDatabase(task);

      // Create worker for agent execution
      const worker = await this.createAgentWorker(agent, task);
      this.activeWorkers.set(task.id, worker);

      // Execute task based on agent role
      await this.executeAgentTask(agent, task);

    } catch (error) {
      task.status = 'failed';
      task.updatedAt = new Date();
      await this.saveTaskToDatabase(task);
      throw error;
    }
  }

  private async executeAgentTask(agent: Agent, task: Task): Promise<void> {
    const context = await this.buildTaskContext(task);
    
    switch (agent.role) {
      case 'planner':
        await this.executePlannerTask(agent, task, context);
        break;
      case 'coder':
        await this.executeCoderTask(agent, task, context);
        break;
      case 'designer':
        await this.executeDesignerTask(agent, task, context);
        break;
      case 'debugger':
        await this.executeDebuggerTask(agent, task, context);
        break;
      case 'reviewer':
        await this.executeReviewerTask(agent, task, context);
        break;
      case 'deployer':
        await this.executeDeployerTask(agent, task, context);
        break;
    }
  }

  private async executePlannerTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please analyze this task and create a detailed implementation plan. Include:
1. Task breakdown with subtasks
2. Dependencies and order of execution
3. Required resources and tools
4. Risk assessment
5. Success criteria`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.3,
      maxTokens: 4096
    });

    // Create plan artifact
    const planArtifact: TaskArtifact = {
      id: `artifact_${Date.now()}`,
      type: 'plan',
      name: 'Implementation Plan',
      content: response.content,
      metadata: {
        agentId: agent.id,
        taskId: task.id,
        createdAt: new Date()
      }
    };

    task.artifacts.push(planArtifact);
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  private async executeCoderTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please implement the required functionality. Provide:
1. Complete code implementation
2. Appropriate tests
3. Documentation
4. Usage examples`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.2,
      maxTokens: 8192
    });

    // Parse and create code artifacts
    const codeMatches = response.content.match(/```(\w+)?\n([\s\S]*?)```/g);
    
    if (codeMatches) {
      for (let i = 0; i < codeMatches.length; i++) {
        const match = codeMatches[i];
        const langMatch = match.match(/```(\w+)?\n/);
        const language = langMatch?.[1] || 'text';
        const code = match.replace(/```(\w+)?\n/, '').replace(/```$/, '');

        const codeArtifact: TaskArtifact = {
          id: `artifact_${Date.now()}_${i}`,
          type: 'code',
          name: `Generated Code ${i + 1}`,
          content: code,
          metadata: {
            language,
            agentId: agent.id,
            taskId: task.id,
            createdAt: new Date()
          }
        };

        task.artifacts.push(codeArtifact);
      }
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  private async executeDesignerTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please design the user interface/experience. Provide:
1. UI component structure
2. Styling and layout
3. Responsive design considerations
4. Accessibility features`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.4,
      maxTokens: 6144
    });

    // Create design artifacts
    const designArtifact: TaskArtifact = {
      id: `artifact_${Date.now()}`,
      type: 'code',
      name: 'UI Design',
      content: response.content,
      metadata: {
        type: 'ui_design',
        agentId: agent.id,
        taskId: task.id,
        createdAt: new Date()
      }
    };

    task.artifacts.push(designArtifact);
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  private async executeDebuggerTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please analyze and debug the issue. Provide:
1. Root cause analysis
2. Detailed explanation of the problem
3. Fix implementation
4. Prevention strategies`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.1,
      maxTokens: 6144
    });

    // Create debug report
    const debugArtifact: TaskArtifact = {
      id: `artifact_${Date.now()}`,
      type: 'documentation',
      name: 'Debug Report',
      content: response.content,
      metadata: {
        type: 'debug_report',
        agentId: agent.id,
        taskId: task.id,
        createdAt: new Date()
      }
    };

    task.artifacts.push(debugArtifact);
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  private async executeReviewerTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please review the provided code/implementation. Provide:
1. Code quality assessment
2. Security considerations
3. Performance implications
4. Suggestions for improvement
5. Compliance with best practices`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.2,
      maxTokens: 6144
    });

    // Create review report
    const reviewArtifact: TaskArtifact = {
      id: `artifact_${Date.now()}`,
      type: 'documentation',
      name: 'Code Review',
      content: response.content,
      metadata: {
        type: 'code_review',
        agentId: agent.id,
        taskId: task.id,
        createdAt: new Date()
      }
    };

    task.artifacts.push(reviewArtifact);
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  private async executeDeployerTask(agent: Agent, task: Task, context: any): Promise<void> {
    const prompt = `${agent.systemPrompt}

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(context, null, 2)}

Please handle the deployment requirements. Provide:
1. Deployment strategy
2. Configuration files
3. Monitoring setup
4. Rollback procedures
5. Health checks`;

    const response = await enhancedAIProvider.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-pro',
      temperature: 0.2,
      maxTokens: 6144
    });

    // Create deployment artifacts
    const deployArtifact: TaskArtifact = {
      id: `artifact_${Date.now()}`,
      type: 'config',
      name: 'Deployment Plan',
      content: response.content,
      metadata: {
        type: 'deployment_plan',
        agentId: agent.id,
        taskId: task.id,
        createdAt: new Date()
      }
    };

    task.artifacts.push(deployArtifact);
    task.status = 'completed';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    
    await this.saveTaskToDatabase(task);
  }

  // Context Building
  private async buildTaskContext(task: Task): Promise<any> {
    const project = await db.projects.get(task.projectId);
    const relatedFiles = await db.files.where('projectId').equals(task.projectId).toArray();
    const recentChats = await db.chats.where('projectId').equals(task.projectId)
      .reverse()
      .limit(10)
      .toArray();

    // Get relevant memories
    const memories = await enhancedVectorDatabase.searchSimilar(
      task.description,
      { projectId: task.projectId },
      5
    );

    return {
      project,
      files: relatedFiles.slice(0, 20), // Limit context size
      recentConversations: recentChats,
      relevantMemories: memories,
      dependencies: task.dependencies
    };
  }

  // Worker Management
  private async createAgentWorker(agent: Agent, task: Task): Promise<Worker> {
    const worker = new Worker(new URL('../workers/agentWorker.ts', import.meta.url), {
      type: 'module'
    });

    // Set up worker message handler
    worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data, task.id);
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.handleWorkerError(task.id, error);
    };

    return worker;
  }

  private handleWorkerMessage(message: any, taskId: string) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return;

    switch (message.type) {
      case 'task-started':
        console.log(`Task ${taskId} started`);
        break;

      case 'task-progress':
        console.log(`Task ${taskId} progress: ${message.progress}%`);
        break;

      case 'task-completed':
        task.status = 'completed';
        task.completedAt = new Date();
        task.artifacts = message.artifacts || [];
        this.saveTaskToDatabase(task);
        break;

      case 'task-failed':
        task.status = 'failed';
        this.saveTaskToDatabase(task);
        console.error(`Task ${taskId} failed:`, message.error);
        break;
    }
  }

  private handleWorkerError(taskId: string, error: ErrorEvent) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'failed';
      this.saveTaskToDatabase(task);
    }
  }

  // Database Operations
  private async saveTaskToDatabase(task: Task): Promise<void> {
    // Since we don't have a tasks table in schema, we'll store in a generic way
    await db.settings.put({
      id: `task_${task.id}`,
      category: 'tasks',
      key: task.id,
      value: task,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  // Public API Methods
  async getTasks(projectId?: string): Promise<Task[]> {
    if (projectId) {
      return this.taskQueue.filter(task => task.projectId === projectId);
    }
    return [...this.taskQueue];
  }

  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async pauseTask(taskId: string): Promise<void> {
    const worker = this.activeWorkers.get(taskId);
    if (worker) {
      worker.terminate();
      this.activeWorkers.delete(taskId);
    }

    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'pending';
      task.updatedAt = new Date();
      await this.saveTaskToDatabase(task);
    }
  }

  async resumeTask(taskId: string): Promise<void> {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task && task.status === 'pending') {
      await this.executeTask(task);
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const worker = this.activeWorkers.get(taskId);
    if (worker) {
      worker.terminate();
      this.activeWorkers.delete(taskId);
    }

    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (taskIndex >= 0) {
      this.taskQueue.splice(taskIndex, 1);
    }
  }

  // Workflow Management
  async createWorkflow(projectId: string, description: string): Promise<WorkflowGraph> {
    // This would create a complex workflow graph
    // For now, we create a simple linear workflow
    const workflow: WorkflowGraph = {
      nodes: [
        { id: 'analyze', type: 'task', data: { type: 'analysis', description } },
        { id: 'plan', type: 'task', data: { type: 'planning', description } },
        { id: 'implement', type: 'task', data: { type: 'implementation', description } },
        { id: 'review', type: 'task', data: { type: 'review', description } },
        { id: 'deploy', type: 'task', data: { type: 'deployment', description } }
      ],
      edges: [
        { from: 'analyze', to: 'plan' },
        { from: 'plan', to: 'implement' },
        { from: 'implement', to: 'review' },
        { from: 'review', to: 'deploy' }
      ]
    };

    this.executionGraph = workflow;
    return workflow;
  }

  async executeWorkflow(workflow: WorkflowGraph, projectId: string): Promise<void> {
    // Execute tasks in dependency order
    for (const node of workflow.nodes) {
      if (node.type === 'task') {
        const task = await this.createTask({
          projectId,
          title: `${node.data.type} Task`,
          description: node.data.description,
          type: node.data.type,
          dependencies: [],
          estimatedDuration: 30, // 30 minutes
          priority: 'medium'
        });

        await this.executeTask(task);
      }
    }
  }

  // Performance Monitoring
  async getPerformanceMetrics(): Promise<{
    tasksCompleted: number;
    averageExecutionTime: number;
    successRate: number;
    activeAgents: number;
  }> {
    const completedTasks = this.taskQueue.filter(t => t.status === 'completed');
    const failedTasks = this.taskQueue.filter(t => t.status === 'failed');
    
    const avgExecutionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => sum + (task.actualDuration || 0), 0) / completedTasks.length
      : 0;

    const successRate = this.taskQueue.length > 0
      ? completedTasks.length / this.taskQueue.length
      : 1;

    return {
      tasksCompleted: completedTasks.length,
      averageExecutionTime: avgExecutionTime,
      successRate,
      activeAgents: Array.from(this.agents.values()).filter(a => a.isActive).length
    };
  }
}

export const agentOrchestra = new AgentOrchestraService();