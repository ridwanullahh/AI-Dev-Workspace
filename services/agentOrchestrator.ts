import { Agent, Task, Project, ChatMessage, TaskResult, AgentPerformance } from './types';
import { storageService } from './storage';
import { aiProviderService } from './aiProvider';
import { embeddingService } from './embeddings';

interface AgentCapability {
  name: string;
  description: string;
  confidence: number;
}

interface TaskAssignment {
  taskId: string;
  agentId: string;
  priority: number;
  dependencies: string[];
  estimatedDuration: number;
}

class AgentOrchestratorService {
  private agents: Map<string, Agent> = new Map();
  private activeAssignments: Map<string, TaskAssignment> = new Map();
  private taskQueue: Task[] = [];
  private isProcessing = false;

  async initialize(): Promise<void> {
    await this.loadAgents();
    this.initializeDefaultAgents();
    this.startTaskProcessor();
  }

  private async loadAgents(): Promise<void> {
    try {
      const agents = await storageService.getAgents();
      for (const agent of agents) {
        this.agents.set(agent.id, agent);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  private initializeDefaultAgents(): void {
    if (this.agents.size === 0) {
      const defaultAgents: Agent[] = [
        {
          id: 'planner',
          name: 'Planner',
          role: 'Architecture & Planning',
          description: 'Designs system architecture and creates development roadmaps',
          capabilities: ['system-design', 'architecture', 'planning', 'requirements-analysis'],
          isActive: true,
          status: 'idle',
          performance: {
            tasksCompleted: 0,
            successRate: 0.95,
            averageTime: 300,
            qualityScore: 0.92,
            userRating: 0.94
          },
          config: {
            primaryProvider: 'gemini',
            fallbackProviders: ['openai', 'claude'],
            temperature: 0.3,
            maxTokens: 4096,
            systemPrompt: `You are a senior software architect and technical planner. You excel at:

1. **System Architecture Design**
   - Breaking down complex requirements into manageable components
   - Designing scalable and maintainable system architectures
   - Creating technical specifications and documentation

2. **Development Planning**
   - Creating detailed project roadmaps and timelines
   - Identifying technical risks and mitigation strategies
   - Defining development phases and milestones

3. **Technology Selection**
   - Recommending appropriate technologies and frameworks
   - Evaluating trade-offs between different technical approaches
   - Ensuring technology choices align with project requirements

Always provide structured, actionable plans with clear reasoning for your recommendations.`,
            tools: ['diagram-generator', 'requirement-analyzer', 'technology-evaluator']
          }
        },
        {
          id: 'coder',
          name: 'Coder',
          role: 'Code Generation',
          description: 'Generates, refactors, and optimizes code across multiple languages',
          capabilities: ['code-generation', 'refactoring', 'optimization', 'multiple-languages'],
          isActive: true,
          status: 'idle',
          performance: {
            tasksCompleted: 0,
            successRate: 0.89,
            averageTime: 180,
            qualityScore: 0.91,
            userRating: 0.87
          },
          config: {
            primaryProvider: 'openai',
            fallbackProviders: ['claude', 'gemini'],
            temperature: 0.2,
            maxTokens: 8192,
            systemPrompt: `You are an expert software developer with deep knowledge across multiple programming languages and frameworks. You specialize in:

1. **Code Generation**
   - Writing clean, efficient, and maintainable code
   - Following best practices and coding standards
   - Implementing proper error handling and validation

2. **Code Refactoring**
   - Improving code structure and readability
   - Optimizing performance and memory usage
   - Removing code smells and technical debt

3. **Multi-Language Expertise**
   - JavaScript/TypeScript, Python, Java, C#, Go, Rust
   - React, React Native, Node.js, Django, Spring Boot
   - Database technologies and cloud platforms

Always write well-documented code with proper testing considerations.`,
            tools: ['code-analyzer', 'syntax-checker', 'performance-profiler']
          }
        },
        {
          id: 'designer',
          name: 'Designer',
          role: 'UI/UX Design',
          description: 'Creates beautiful interfaces and user experience flows',
          capabilities: ['ui-design', 'ux-research', 'prototyping', 'accessibility'],
          isActive: true,
          status: 'idle',
          performance: {
            tasksCompleted: 0,
            successRate: 0.96,
            averageTime: 420,
            qualityScore: 0.94,
            userRating: 0.93
          },
          config: {
            primaryProvider: 'claude',
            fallbackProviders: ['gemini', 'openai'],
            temperature: 0.7,
            maxTokens: 4096,
            systemPrompt: `You are a senior UI/UX designer with expertise in creating beautiful, functional, and accessible digital experiences. You excel at:

1. **User Interface Design**
   - Creating visually appealing and intuitive interfaces
   - Designing responsive layouts for all screen sizes
   - Establishing consistent design systems and style guides

2. **User Experience Design**
   - Analyzing user needs and behaviors
   - Creating user flows and journey maps
   - Designing for accessibility and inclusivity

3. **Design Implementation**
   - Translating designs into component specifications
   - Creating design tokens and reusable components
   - Collaborating with developers for pixel-perfect implementation

Focus on user-centered design principles and modern design trends.`,
            tools: ['design-system-generator', 'accessibility-checker', 'user-flow-creator']
          }
        },
        {
          id: 'debugger',
          name: 'Debugger',
          role: 'Quality Assurance',
          description: 'Identifies bugs, performance issues, and code quality problems',
          capabilities: ['bug-detection', 'performance-analysis', 'testing', 'code-review'],
          isActive: false,
          status: 'idle',
          performance: {
            tasksCompleted: 0,
            successRate: 0.87,
            averageTime: 240,
            qualityScore: 0.88,
            userRating: 0.85
          },
          config: {
            primaryProvider: 'openai',
            fallbackProviders: ['gemini', 'claude'],
            temperature: 0.1,
            maxTokens: 6144,
            systemPrompt: `You are a senior quality assurance engineer and code reviewer with expertise in finding and fixing issues. You specialize in:

1. **Bug Detection & Analysis**
   - Identifying logic errors, edge cases, and potential failures
   - Analyzing error logs and stack traces
   - Finding security vulnerabilities and performance bottlenecks

2. **Code Quality Review**
   - Reviewing code for best practices and standards
   - Identifying code smells and technical debt
   - Ensuring proper error handling and validation

3. **Testing Strategy**
   - Designing comprehensive test cases and scenarios
   - Recommending testing frameworks and tools
   - Creating automated testing strategies

Provide detailed analysis with specific recommendations for fixes.`,
            tools: ['static-analyzer', 'vulnerability-scanner', 'performance-monitor']
          }
        },
        {
          id: 'devops',
          name: 'DevOps',
          role: 'Deployment & CI/CD',
          description: 'Handles deployment, infrastructure, and continuous integration',
          capabilities: ['deployment', 'ci-cd', 'infrastructure', 'monitoring'],
          isActive: true,
          status: 'idle',
          performance: {
            tasksCompleted: 0,
            successRate: 0.91,
            averageTime: 360,
            qualityScore: 0.89,
            userRating: 0.88
          },
          config: {
            primaryProvider: 'gemini',
            fallbackProviders: ['openai', 'claude'],
            temperature: 0.2,
            maxTokens: 4096,
            systemPrompt: `You are a senior DevOps engineer with expertise in cloud infrastructure, deployment automation, and system reliability. You excel at:

1. **Deployment & CI/CD**
   - Setting up automated deployment pipelines
   - Configuring continuous integration and delivery
   - Managing release processes and rollback strategies

2. **Infrastructure Management**
   - Designing scalable cloud architectures
   - Managing containerization and orchestration
   - Implementing monitoring and alerting systems

3. **System Operations**
   - Optimizing system performance and reliability
   - Managing security and compliance requirements
   - Troubleshooting production issues

Focus on automation, reliability, and best practices for production systems.`,
            tools: ['deployment-manager', 'monitoring-setup', 'security-scanner']
          }
        }
      ];

      for (const agent of defaultAgents) {
        this.agents.set(agent.id, agent);
      }

      this.saveAgents();
    }
  }

  async assignTask(task: Task): Promise<string> {
    // Add task to queue
    this.taskQueue.push(task);
    await storageService.saveTask(task);

    // Find best agent for this task
    const bestAgent = await this.findBestAgent(task);
    if (bestAgent) {
      const assignment: TaskAssignment = {
        taskId: task.id,
        agentId: bestAgent.id,
        priority: this.calculatePriority(task),
        dependencies: task.dependencies,
        estimatedDuration: this.estimateTaskDuration(task, bestAgent)
      };

      this.activeAssignments.set(task.id, assignment);
      bestAgent.status = 'working';
      bestAgent.currentTask = task;
      
      await this.saveAgent(bestAgent);
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processTaskQueue();
      }

      return bestAgent.id;
    }

    throw new Error('No suitable agent available for this task');
  }

  private async findBestAgent(task: Task): Promise<Agent | null> {
    const availableAgents = Array.from(this.agents.values()).filter(
      agent => agent.isActive && agent.status === 'idle'
    );

    if (availableAgents.length === 0) return null;

    // Score agents based on capability match and performance
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task)
    }));

    // Sort by score and return best match
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agent || null;
  }

  private calculateAgentScore(agent: Agent, task: Task): number {
    let score = 0;

    // Capability matching
    const taskRequirements = this.getTaskRequirements(task);
    for (const requirement of taskRequirements) {
      if (agent.capabilities.includes(requirement)) {
        score += 10;
      }
    }

    // Performance factors
    score += agent.performance.successRate * 5;
    score += agent.performance.qualityScore * 3;
    score += agent.performance.userRating * 2;

    // Availability bonus
    if (agent.status === 'idle') score += 5;

    // Task type matching
    if (this.isTaskTypeMatch(agent.role, task.type)) {
      score += 15;
    }

    return score;
  }

  private getTaskRequirements(task: Task): string[] {
    const requirements: string[] = [];
    
    switch (task.type) {
      case 'code':
        requirements.push('code-generation', 'refactoring', 'multiple-languages');
        break;
      case 'design':
        requirements.push('ui-design', 'ux-research', 'prototyping');
        break;
      case 'debug':
        requirements.push('bug-detection', 'performance-analysis', 'testing');
        break;
      case 'deploy':
        requirements.push('deployment', 'ci-cd', 'infrastructure');
        break;
      case 'analyze':
        requirements.push('system-design', 'architecture', 'requirements-analysis');
        break;
      case 'test':
        requirements.push('testing', 'code-review', 'bug-detection');
        break;
    }

    return requirements;
  }

  private isTaskTypeMatch(agentRole: string, taskType: string): boolean {
    const matches = {
      'Architecture & Planning': ['analyze', 'design'],
      'Code Generation': ['code', 'test'],
      'UI/UX Design': ['design'],
      'Quality Assurance': ['debug', 'test'],
      'Deployment & CI/CD': ['deploy']
    };

    return matches[agentRole]?.includes(taskType) || false;
  }

  private calculatePriority(task: Task): number {
    const priorityMap = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return priorityMap[task.priority] || 2;
  }

  private estimateTaskDuration(task: Task, agent: Agent): number {
    // Base duration by task type (in minutes)
    const baseDurations = {
      'code': 180,
      'design': 240,
      'debug': 120,
      'test': 90,
      'deploy': 60,
      'analyze': 150
    };

    let duration = baseDurations[task.type] || 120;
    
    // Adjust based on agent performance
    const efficiencyFactor = (agent.performance.averageTime / duration) * 0.8 + 0.2;
    duration *= efficiencyFactor;

    // Adjust based on task complexity (simple heuristic)
    const complexityFactor = Math.min(task.description.length / 500, 2);
    duration *= (1 + complexityFactor * 0.5);

    return Math.round(duration);
  }

  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      const assignment = this.activeAssignments.get(task.id);
      
      if (assignment) {
        await this.executeTask(task, assignment);
      }
      
      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  private async executeTask(task: Task, assignment: TaskAssignment): Promise<void> {
    const agent = this.agents.get(assignment.agentId);
    if (!agent) return;

    try {
      task.status = 'in_progress';
      await storageService.saveTask(task);

      // Simulate task execution with AI provider
      const result = await this.performAgentTask(agent, task);
      
      task.status = 'completed';
      task.result = result;
      task.actualTime = Date.now() - new Date(task.createdAt).getTime();
      task.updatedAt = new Date();

      // Update agent performance
      agent.performance.tasksCompleted++;
      agent.performance.successRate = this.calculateSuccessRate(agent);
      agent.performance.averageTime = this.updateAverageTime(agent, task.actualTime!);
      
      agent.status = 'idle';
      agent.currentTask = undefined;

    } catch (error) {
      task.status = 'failed';
      task.result = {
        output: '',
        files: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {}
      };
      
      agent.status = 'error';
      console.error(`Task ${task.id} failed:`, error);
    }

    await storageService.saveTask(task);
    await this.saveAgent(agent);
    this.activeAssignments.delete(task.id);
  }

  private async performAgentTask(agent: Agent, task: Task): Promise<TaskResult> {
    // Prepare context for the agent
    const context = await this.prepareTaskContext(task);
    
    // Create messages for AI provider
    const messages: ChatMessage[] = [
      {
        id: `system_${Date.now()}`,
        content: agent.config.systemPrompt,
        role: 'system',
        timestamp: new Date()
      },
      {
        id: `task_${task.id}`,
        content: this.formatTaskPrompt(task, context),
        role: 'user',
        timestamp: new Date()
      }
    ];

    try {
      // Use AI provider to get response
      const response = await aiProviderService.sendMessage({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        model: agent.config.primaryProvider,
        temperature: agent.config.temperature,
        maxTokens: agent.config.maxTokens
      });

      // Parse response and extract files if any
      const files = this.extractFilesFromResponse(response.content);
      
      return {
        output: response.content,
        files,
        success: true,
        metadata: {
          model: response.model,
          provider: agent.config.primaryProvider,
          tokens: response.usage.totalTokens,
          cost: response.cost
        }
      };
    } catch (error) {
      return {
        output: '',
        files: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {}
      };
    }
  }

  private async prepareTaskContext(task: Task): Promise<any> {
    // Gather relevant context for the task
    const context: any = {
      project: null,
      relatedFiles: [],
      previousTasks: [],
      knowledge: []
    };

    try {
      // Get project context if available
      if (task.projectId) {
        const project = await storageService.getProject(task.projectId);
        if (project) {
          context.project = {
            id: project.id,
            name: project.name,
            type: project.type,
            description: project.description
          };

          // Get project files
          context.relatedFiles = await storageService.getProjectFiles(task.projectId);
        }
      }

      // Get previous related tasks
      const allTasks = await storageService.getTasks(task.projectId);
      context.previousTasks = allTasks
        .filter(t => t.id !== task.id && t.status === 'completed')
        .slice(-5); // Last 5 completed tasks

      // Get relevant knowledge from vector search
      if (task.description) {
        const searchResults = await embeddingService.search(task.description, {
          projectId: task.projectId,
          limit: 3,
          threshold: 0.4
        });
        context.knowledge = searchResults;
      }

    } catch (error) {
      console.error('Failed to prepare task context:', error);
    }

    return context;
  }

  private formatTaskPrompt(task: Task, context: any): string {
    let prompt = `**Task Assignment**\n\n`;
    
    prompt += `**Task Details:**\n`;
    prompt += `- Type: ${task.type}\n`;
    prompt += `- Priority: ${task.priority}\n`;
    prompt += `- Title: ${task.title}\n`;
    prompt += `- Description: ${task.description}\n\n`;

    if (context.project) {
      prompt += `**Project Context:**\n`;
      prompt += `- Project: ${context.project.name} (${context.project.type})\n`;
      prompt += `- Description: ${context.project.description}\n\n`;
    }

    if (context.relatedFiles && context.relatedFiles.length > 0) {
      prompt += `**Related Files:**\n`;
      context.relatedFiles.slice(0, 3).forEach((file: any, index: number) => {
        prompt += `${index + 1}. ${file.path} (${file.language})\n`;
      });
      prompt += `\n`;
    }

    if (context.previousTasks && context.previousTasks.length > 0) {
      prompt += `**Previous Work:**\n`;
      context.previousTasks.forEach((prevTask: any, index: number) => {
        prompt += `${index + 1}. ${prevTask.title}: ${prevTask.result?.output?.substring(0, 100)}...\n`;
      });
      prompt += `\n`;
    }

    prompt += `**Instructions:**\n`;
    prompt += `1. Analyze the task requirements carefully\n`;
    prompt += `2. Consider the project context and existing codebase\n`;
    prompt += `3. Provide a detailed, actionable solution\n`;
    prompt += `4. Include code examples where appropriate\n`;
    prompt += `5. Identify any potential issues or considerations\n`;
    prompt += `6. Suggest best practices and next steps\n\n`;

    prompt += `Please provide a comprehensive response that addresses all aspects of this task.`;

    return prompt;
  }

  private extractFilesFromResponse(content: string): any[] {
    const files: any[] = [];
    
    // Extract code blocks from response
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const codeContent = match[1];
      const lines = codeContent.split('\n');
      
      if (lines.length > 0) {
        // Try to extract file path from first line if it looks like a path
        const firstLine = lines[0].trim();
        let filePath = '';
        let language = '';
        
        // Check if first line looks like a file path
        if (firstLine.includes('.') && !firstLine.includes(' ')) {
          filePath = firstLine;
          language = filePath.split('.').pop() || 'text';
          // Remove the file path from the code content
          lines.shift();
        } else {
          filePath = `generated_file_${files.length + 1}.${this.detectLanguage(lines.join('\n'))}`;
          language = this.detectLanguage(lines.join('\n'));
        }
        
        files.push({
          id: `file_${Date.now()}_${files.length}`,
          path: filePath,
          name: filePath.split('/').pop() || filePath,
          content: lines.join('\n'),
          language,
          size: lines.join('\n').length,
          lastModified: new Date(),
          isGenerated: true
        });
      }
    }
    
    return files;
  }

  private detectLanguage(code: string): string {
    // Simple language detection based on code patterns
    const patterns = {
      javascript: /function|const|let|var|=>|import|export/,
      typescript: /interface|type|:.*string|:.*number|:.*boolean/,
      python: /def |import |from |if __name__|print\(/,
      java: /public class|private|void static|System\.out/,
      css: /{|}|margin:|padding:|background:/,
      html: /<div|<span|<p>|<h[1-6]/,
      sql: /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/
    };

    for (const [language, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return language;
      }
    }

    return 'text';
  }

  private calculateSuccessRate(agent: Agent): number {
    // This would be calculated based on actual task outcomes
    // For now, maintain current rate with slight improvement
    return Math.min(agent.performance.successRate + 0.01, 0.99);
  }

  private updateAverageTime(agent: Agent, newTime: number): number {
    const currentAvg = agent.performance.averageTime;
    const totalTasks = agent.performance.tasksCompleted;
    
    return Math.round((currentAvg * (totalTasks - 1) + newTime) / totalTasks);
  }

  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async toggleAgent(agentId: string, isActive: boolean): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isActive = isActive;
      if (!isActive && agent.status === 'working') {
        // Handle task reassignment if needed
        agent.status = 'idle';
        agent.currentTask = undefined;
      }
      await this.saveAgent(agent);
    }
  }

  async updateAgentConfig(agentId: string, config: Partial<Agent['config']>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.config = { ...agent.config, ...config };
      await this.saveAgent(agent);
    }
  }

  private async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    await storageService.saveAgent(agent);
  }

  private async saveAgents(): Promise<void> {
    for (const agent of this.agents.values()) {
      await storageService.saveAgent(agent);
    }
  }

  startTaskProcessor(): void {
    // Process task queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processTaskQueue();
      }
    }, 30000);
  }

  getOrchestrationStats(): {
    totalAgents: number;
    activeAgents: number;
    tasksInQueue: number;
    activeAssignments: number;
    totalTasksCompleted: number;
    averageSuccessRate: number;
  } {
    const agents = Array.from(this.agents.values());
    
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.isActive).length,
      tasksInQueue: this.taskQueue.length,
      activeAssignments: this.activeAssignments.size,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
      averageSuccessRate: agents.reduce((sum, a) => sum + a.performance.successRate, 0) / agents.length
    };
  }
}
    if (agent) {
      agent.isActive = isActive;
      if (!isActive && agent.status === 'working') {
        // Handle task reassignment if needed
        agent.status = 'idle';
        agent.currentTask = undefined;
      }
      await this.saveAgent(agent);
    }
  }

export const agentOrchestratorService = new AgentOrchestratorService();