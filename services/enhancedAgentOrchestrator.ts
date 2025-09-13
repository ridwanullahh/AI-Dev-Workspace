import { Agent, Task, ChatMessage, TaskResult, AgentPerformance } from './types';
import { storageService } from './storage';
import { aiProviderService } from './aiProvider';
import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { semanticMemoryArchitecture } from './semanticMemory';
import { knowledgeGraphSystem } from './knowledgeGraph';
import { contextManagementSystem } from './contextManager';

interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'broadcast' | 'coordination' | 'delegation' | 'status';
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata: Record<string, any>;
  responseExpected: boolean;
  relatedTaskId?: string;
}

interface AgentCollaboration {
  id: string;
  taskId: string;
  participants: string[];
  collaborationType: 'sequential' | 'parallel' | 'hierarchical' | 'consensus';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  messages: AgentMessage[];
  outcomes: Record<string, any>;
  startTime: Date;
  endTime?: Date;
}

interface AgentNegotiation {
  id: string;
  topic: string;
  participants: string[];
  proposals: AgentProposal[];
  status: 'initiated' | 'negotiating' | 'agreed' | 'failed';
  resolution?: any;
  startTime: Date;
  endTime?: Date;
}

interface AgentProposal {
  id: string;
  agentId: string;
  content: string;
  confidence: number;
  priority: number;
  timestamp: Date;
  votes: { agentId: string; vote: 'for' | 'against' | 'abstain' }[];
}

interface AgentSpecialization {
  agentId: string;
  specializations: string[];
  expertise: Record<string, number>;
  performance: Record<string, number>;
  collaborationHistory: string[];
  preferredPartners: string[];
  avoidedPartners: string[];
}

interface OrchestratorConfig {
  maxConcurrentTasks: number;
  collaborationTimeout: number;
  negotiationTimeout: number;
  enableAutoCoordination: boolean;
  enableLearning: boolean;
  performanceTracking: boolean;
}

interface OrchestratorAnalytics {
  totalTasksProcessed: number;
  averageTaskTime: number;
  collaborationSuccessRate: number;
  negotiationSuccessRate: number;
  agentUtilization: Record<string, number>;
  interAgentMessages: number;
  learningEvents: number;
}

class EnhancedAgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private activeTasks: Map<string, Task> = new Map();
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private negotiations: Map<string, AgentNegotiation> = new Map();
  private messageQueue: AgentMessage[] = [];
  private specializations: Map<string, AgentSpecialization> = new Map();
  private orchestratorConfig: OrchestratorConfig = {
    maxConcurrentTasks: 5,
    collaborationTimeout: 300000, // 5 minutes
    negotiationTimeout: 120000, // 2 minutes
    enableAutoCoordination: true,
    enableLearning: true,
    performanceTracking: true
  };
  private isInitialized = false;
  private processingMessages = false;
  private analytics: OrchestratorAnalytics = {
    totalTasksProcessed: 0,
    averageTaskTime: 0,
    collaborationSuccessRate: 0,
    negotiationSuccessRate: 0,
    agentUtilization: {},
    interAgentMessages: 0,
    learningEvents: 0
  };

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Enhanced Agent Orchestrator...');
      
      // Load existing agents
      await this.loadAgents();
      
      // Load specializations
      await this.loadSpecializations();
      
      // Load active collaborations
      await this.loadCollaborations();
      
      // Start message processing
      this.startMessageProcessing();
      
      // Start periodic maintenance
      this.startMaintenance();
      
      this.isInitialized = true;
      console.log('Enhanced Agent Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Agent Orchestrator:', error);
      throw error;
    }
  }

  private async loadAgents(): Promise<void> {
    try {
      const agents = await storageService.getAgents();
      for (const agent of agents) {
        this.agents.set(agent.id, agent);
      }
      console.log(`Loaded ${agents.length} agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  private async loadSpecializations(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData();
      if (data && data.agentSpecializations) {
        this.specializations = new Map(data.agentSpecializations);
        console.log(`Loaded ${this.specializations.size} agent specializations`);
      }
    } catch (error) {
      console.error('Failed to load specializations:', error);
    }
  }

  private async loadCollaborations(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData();
      if (data && data.collaborations) {
        this.collaborations = new Map(data.collaborations);
        console.log(`Loaded ${this.collaborations.size} active collaborations`);
      }
    } catch (error) {
      console.error('Failed to load collaborations:', error);
    }
  }

  private startMessageProcessing(): void {
    setInterval(() => {
      this.processMessageQueue();
    }, 1000); // Process messages every second
  }

  private startMaintenance(): void {
    // Run maintenance every 5 minutes
    setInterval(() => {
      this.performMaintenance();
    }, 300000);
  }

  async assignTask(task: Task, options: {
    requireCollaboration?: boolean;
    preferredAgents?: string[];
    forceAgent?: string;
  } = {}): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      requireCollaboration = false,
      preferredAgents = [],
      forceAgent
    } = options;

    // Store task
    this.activeTasks.set(task.id, task);
    await storageService.saveTask(task);

    let assignedAgentId: string;

    if (forceAgent) {
      assignedAgentId = forceAgent;
    } else if (requireCollaboration) {
      assignedAgentId = await this.initiateCollaborativeTask(task, preferredAgents);
    } else {
      assignedAgentId = await this.findBestAgentForTask(task, preferredAgents);
    }

    // Update agent status
    const agent = this.agents.get(assignedAgentId);
    if (agent) {
      agent.status = 'working';
      agent.currentTask = task;
      await this.saveAgent(agent);
    }

    // Start task execution
    await this.executeTask(task, assignedAgentId);

    return assignedAgentId;
  }

  private async findBestAgentForTask(task: Task, preferredAgents: string[]): Promise<string> {
    const availableAgents = Array.from(this.agents.values()).filter(
      agent => agent.isActive && agent.status === 'idle'
    );

    if (availableAgents.length === 0) {
      throw new Error('No available agents for task assignment');
    }

    // Score agents based on multiple factors
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentTaskScore(agent, task, preferredAgents)
    }));

    // Sort by score and return best match
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent.id;
  }

  private calculateAgentTaskScore(agent: Agent, task: Task, preferredAgents: string[]): number {
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

    // Specialization matching
    const specialization = this.specializations.get(agent.id);
    if (specialization) {
      for (const requirement of taskRequirements) {
        const expertise = specialization.expertise[requirement] || 0;
        score += expertise * 5;
      }
    }

    // Preferred agent bonus
    if (preferredAgents.includes(agent.id)) {
      score += 15;
    }

    // Availability bonus
    if (agent.status === 'idle') score += 5;

    // Task type matching
    if (this.isTaskTypeMatch(agent.role, task.type)) {
      score += 10;
    }

    return score;
  }

  private getTaskRequirements(task: Task): string[] {
    const requirements: string[] = [];
    
    switch (task.type) {
      case 'code':
        requirements.push('code-generation', 'refactoring', 'optimization', 'multiple-languages');
        break;
      case 'design':
        requirements.push('ui-design', 'ux-research', 'prototyping', 'accessibility');
        break;
      case 'debug':
        requirements.push('bug-detection', 'performance-analysis', 'testing', 'code-review');
        break;
      case 'deploy':
        requirements.push('deployment', 'ci-cd', 'infrastructure', 'monitoring');
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

  private async initiateCollaborativeTask(task: Task, preferredAgents: string[]): Promise<string> {
    // Determine collaboration participants
    const participants = await this.selectCollaborationParticipants(task, preferredAgents);
    
    // Create collaboration
    const collaboration: AgentCollaboration = {
      id: `collab_${task.id}_${Date.now()}`,
      taskId: task.id,
      participants,
      collaborationType: this.determineCollaborationType(task),
      status: 'initiated',
      messages: [],
      outcomes: {},
      startTime: new Date()
    };

    this.collaborations.set(collaboration.id, collaboration);

    // Send coordination message to participants
    await this.sendCoordinationMessage(collaboration);

    // Return primary agent (first participant)
    return participants[0];
  }

  private async selectCollaborationParticipants(task: Task, preferredAgents: string[]): Promise<string[]> {
    const availableAgents = Array.from(this.agents.values()).filter(
      agent => agent.isActive && agent.status === 'idle'
    );

    // Score agents for collaboration
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateCollaborationScore(agent, task, preferredAgents)
    }));

    // Select top agents based on task complexity
    const complexity = this.assessTaskComplexity(task);
    const participantCount = Math.min(
      complexity === 'high' ? 3 : complexity === 'medium' ? 2 : 1,
      availableAgents.length
    );

    return scoredAgents
      .sort((a, b) => b.score - a.score)
      .slice(0, participantCount)
      .map(item => item.agent.id);
  }

  private calculateCollaborationScore(agent: Agent, task: Task, preferredAgents: string[]): number {
    let score = this.calculateAgentTaskScore(agent, task, preferredAgents);

    // Collaboration history bonus
    const specialization = this.specializations.get(agent.id);
    if (specialization && specialization.collaborationHistory.length > 0) {
      score += 5;
    }

    // Communication skills bonus
    if (agent.capabilities.includes('communication')) {
      score += 3;
    }

    return score;
  }

  private assessTaskComplexity(task: Task): 'low' | 'medium' | 'high' {
    let complexity = 0;

    // Description length
    if (task.description.length > 1000) complexity += 1;
    if (task.description.length > 2000) complexity += 1;

    // Priority
    if (task.priority === 'high') complexity += 1;
    if (task.priority === 'urgent') complexity += 2;

    // Dependencies
    if (task.dependencies.length > 2) complexity += 1;
    if (task.dependencies.length > 5) complexity += 1;

    // Type complexity
    const typeComplexity = {
      'code': 2,
      'design': 2,
      'debug': 3,
      'deploy': 1,
      'analyze': 3,
      'test': 1
    };
    complexity += typeComplexity[task.type] || 1;

    if (complexity >= 5) return 'high';
    if (complexity >= 3) return 'medium';
    return 'low';
  }

  private determineCollaborationType(task: Task): 'sequential' | 'parallel' | 'hierarchical' | 'consensus' {
    const complexity = this.assessTaskComplexity(task);
    
    if (complexity === 'high') {
      return 'consensus';
    } else if (task.type === 'code' || task.type === 'design') {
      return 'parallel';
    } else if (task.type === 'deploy') {
      return 'sequential';
    } else {
      return 'hierarchical';
    }
  }

  private async sendCoordinationMessage(collaboration: AgentCollaboration): Promise<void> {
    const task = this.activeTasks.get(collaboration.taskId);
    if (!task) return;

    const message: AgentMessage = {
      id: `coord_${collaboration.id}_${Date.now()}`,
      fromAgentId: 'orchestrator',
      toAgentId: 'broadcast',
      type: 'coordination',
      content: `Collaboration initiated for task: ${task.title}. Type: ${collaboration.collaborationType}. Participants: ${collaboration.participants.join(', ')}`,
      priority: 'high',
      timestamp: new Date(),
      metadata: {
        collaborationId: collaboration.id,
        taskId: task.id,
        collaborationType: collaboration.collaborationType
      },
      responseExpected: true,
      relatedTaskId: task.id
    };

    this.messageQueue.push(message);
  }

  private async executeTask(task: Task, agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      task.status = 'in_progress';
      await storageService.saveTask(task);

      // Check if this is a collaborative task
      const collaboration = Array.from(this.collaborations.values())
        .find(collab => collab.taskId === task.id);

      if (collaboration) {
        await this.executeCollaborativeTask(task, agent, collaboration);
      } else {
        await this.executeIndividualTask(task, agent);
      }

    } catch (error) {
      await this.handleTaskError(task, agent, error);
    }
  }

  private async executeCollaborativeTask(task: Task, agent: Agent, collaboration: AgentCollaboration): Promise<void> {
    collaboration.status = 'in_progress';

    // Send task start message
    await this.sendAgentMessage({
      fromAgentId: agent.id,
      toAgentId: 'broadcast',
      type: 'status',
      content: `Starting collaborative task: ${task.title}`,
      priority: 'medium',
      metadata: { collaborationId: collaboration.id, taskId: task.id },
      responseExpected: false,
      relatedTaskId: task.id
    });

    // Execute based on collaboration type
    switch (collaboration.collaborationType) {
      case 'sequential':
        await this.executeSequentialCollaboration(task, agent, collaboration);
        break;
      case 'parallel':
        await this.executeParallelCollaboration(task, agent, collaboration);
        break;
      case 'hierarchical':
        await this.executeHierarchicalCollaboration(task, agent, collaboration);
        break;
      case 'consensus':
        await this.executeConsensusCollaboration(task, agent, collaboration);
        break;
    }

    collaboration.status = 'completed';
    collaboration.endTime = new Date();
  }

  private async executeSequentialCollaboration(task: Task, primaryAgent: Agent, collaboration: AgentCollaboration): Promise<void> {
    const participants = collaboration.participants.filter(id => id !== primaryAgent.id);
    
    // Primary agent starts work
    const primaryResult = await this.performAgentTask(primaryAgent, task);
    
    // Sequentially involve other agents
    for (const participantId of participants) {
      const participant = this.agents.get(participantId);
      if (!participant) continue;

      // Request input from participant
      const response = await this.requestAgentInput(participant, task, primaryResult);
      
      // Incorporate feedback
      if (response.success) {
        primaryResult.output += `\n\nFeedback from ${participant.name}:\n${response.output}`;
      }
    }

    // Final result
    task.result = primaryResult;
    task.status = 'completed';
    await storageService.saveTask(task);
  }

  private async executeParallelCollaboration(task: Task, primaryAgent: Agent, collaboration: AgentCollaboration): Promise<void> {
    const participants = collaboration.participants.filter(id => id !== primaryAgent.id);
    
    // All agents work in parallel
    const promises = participants.map(async (participantId) => {
      const participant = this.agents.get(participantId);
      if (!participant) return null;

      return this.performAgentTask(participant, {
        ...task,
        id: `${task.id}_${participantId}`,
        title: `${task.title} (${participant.name})`
      });
    });

    const results = await Promise.all(promises);
    
    // Primary agent synthesizes results
    const synthesis = await this.synthesizeResults(primaryAgent, task, results.filter(r => r !== null) as TaskResult[]);
    
    task.result = synthesis;
    task.status = 'completed';
    await storageService.saveTask(task);
  }

  private async executeHierarchicalCollaboration(task: Task, primaryAgent: Agent, collaboration: AgentCollaboration): Promise<void> {
    // Primary agent creates plan
    const planResult = await this.performAgentTask(primaryAgent, {
      ...task,
      description: `${task.description}\n\nCreate a detailed plan for this task and assign subtasks to team members.`
    });

    // Parse plan and assign subtasks
    const subtasks = this.parseSubtasksFromPlan(planResult.output);
    
    // Execute subtasks
    const subtaskResults: TaskResult[] = [];
    for (const subtask of subtasks) {
      const assignedAgent = this.agents.get(subtask.assignedAgent);
      if (assignedAgent) {
        const result = await this.performAgentTask(assignedAgent, subtask);
        subtaskResults.push(result);
      }
    }

    // Primary agent synthesizes final result
    const finalResult = await this.synthesizeResults(primaryAgent, task, subtaskResults);
    
    task.result = finalResult;
    task.status = 'completed';
    await storageService.saveTask(task);
  }

  private async executeConsensusCollaboration(task: Task, primaryAgent: Agent, collaboration: AgentCollaboration): Promise<void> {
    // All agents propose solutions
    const proposals: TaskResult[] = [];
    
    for (const participantId of collaboration.participants) {
      const participant = this.agents.get(participantId);
      if (!participant) continue;

      const proposal = await this.performAgentTask(participant, {
        ...task,
        id: `${task.id}_proposal_${participantId}`,
        description: `${task.description}\n\nProvide your proposed solution for this task.`
      });
      
      proposals.push(proposal);
    }

    // Reach consensus through negotiation
    const consensusResult = await this.reachConsensus(primaryAgent, task, proposals);
    
    task.result = consensusResult;
    task.status = 'completed';
    await storageService.saveTask(task);
  }

  private async executeIndividualTask(task: Task, agent: Agent): Promise<void> {
    const result = await this.performAgentTask(agent, task);
    
    task.result = result;
    task.status = 'completed';
    task.actualTime = Date.now() - new Date(task.createdAt).getTime();
    task.updatedAt = new Date();

    // Update agent performance
    agent.performance.tasksCompleted++;
    agent.performance.successRate = this.calculateSuccessRate(agent);
    agent.performance.averageTime = this.updateAverageTime(agent, task.actualTime!);
    
    agent.status = 'idle';
    agent.currentTask = undefined;

    await storageService.saveTask(task);
    await this.saveAgent(agent);

    // Update analytics
    this.analytics.totalTasksProcessed++;
    this.analytics.averageTaskTime = this.updateAverageTaskTime(task.actualTime!);
  }

  private async performAgentTask(agent: Agent, task: Task): Promise<TaskResult> {
    // Prepare context for the agent
    const context = await this.prepareEnhancedTaskContext(task, agent);
    
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
        content: this.formatEnhancedTaskPrompt(task, context),
        role: 'user',
        timestamp: new Date()
      }
    ];

    // Send to AI provider
    const response = await aiProviderService.sendMessage({
      messages,
      model: agent.config.primaryProvider,
      temperature: agent.config.temperature,
      maxTokens: agent.config.maxTokens
    });

    // Process the response and create result
    return {
      output: response.content,
      files: [], // Would be populated based on agent's output
      success: true,
      metadata: {
        agent: agent.id,
        model: response.model,
        tokens: response.usage.totalTokens,
        processingTime: Date.now() - new Date(task.createdAt).getTime()
      }
    };
  }

  private async prepareEnhancedTaskContext(task: Task, agent: Agent): Promise<string> {
    let context = '';

    // Get project context
    const project = await storageService.getProject(task.projectId);
    if (project) {
      context += `Project: ${project.name}\nDescription: ${project.description}\n\n`;
    }

    // Get optimized context from context manager
    try {
      const optimizedContext = await contextManagementSystem.getOptimizedContext(
        `context_${task.projectId}_main`,
        {
          query: task.description,
          maxTokens: 1000,
          includeTypes: ['messages', 'memories', 'knowledge']
        }
      );

      if (optimizedContext.messages.length > 0) {
        context += 'Recent Messages:\n';
        for (const message of optimizedContext.messages.slice(0, 3)) {
          context += `- ${message.role}: ${message.content.substring(0, 100)}...\n`;
        }
        context += '\n';
      }

      if (optimizedContext.memories.length > 0) {
        context += 'Relevant Memories:\n';
        for (const memory of optimizedContext.memories.slice(0, 2)) {
          context += `- ${memory.content.substring(0, 100)}...\n`;
        }
        context += '\n';
      }
    } catch (error) {
      console.error('Failed to get optimized context:', error);
    }

    // Get relevant semantic search results
    try {
      const searchResults = await enhancedVectorDatabase.search(task.description, {
        projectId: task.projectId,
        limit: 3,
        threshold: 0.4
      });

      if (searchResults.length > 0) {
        context += 'Relevant Content:\n';
        for (const result of searchResults) {
          context += `- ${result.content.substring(0, 150)}...\n`;
        }
        context += '\n';
      }
    } catch (error) {
      console.error('Failed to search for relevant content:', error);
    }

    return context;
  }

  private formatEnhancedTaskPrompt(task: Task, context: string): string {
    return `${context}

**Task Details:**
- Type: ${task.type}
- Priority: ${task.priority}
- Title: ${task.title}
- Description: ${task.description}
- Dependencies: ${task.dependencies.join(', ')}

**Agent Instructions:**
1. Analyze the task requirements carefully
2. Consider the provided context and relevant information
3. Provide a comprehensive, actionable solution
4. Identify potential risks and mitigation strategies
5. Suggest next steps or follow-up actions

Please provide your response in a clear, structured format that can be easily understood and implemented.`;
  }

  private async requestAgentInput(agent: Agent, task: Task, currentResult: TaskResult): Promise<TaskResult> {
    const messages: ChatMessage[] = [
      {
        id: `system_${Date.now()}`,
        content: `You are ${agent.name}, a ${agent.role}. Please review the following work and provide your feedback, suggestions, or improvements.`,
        role: 'system',
        timestamp: new Date()
      },
      {
        id: `review_${Date.now()}`,
        content: `Task: ${task.title}\n\nCurrent Work:\n${currentResult.output}\n\nPlease provide your feedback and suggestions for improvement.`,
        role: 'user',
        timestamp: new Date()
      }
    ];

    const response = await aiProviderService.sendMessage({
      messages,
      model: agent.config.primaryProvider,
      temperature: agent.config.temperature,
      maxTokens: agent.config.maxTokens
    });

    return {
      output: response.content,
      files: [],
      success: true,
      metadata: {
        agent: agent.id,
        model: response.model,
        tokens: response.usage.totalTokens,
        processingTime: Date.now() - new Date().getTime()
      }
    };
  }

  private async synthesizeResults(agent: Agent, task: Task, results: TaskResult[]): Promise<TaskResult> {
    const synthesisPrompt = results.map((result, index) => 
      `Result ${index + 1}:\n${result.output}`
    ).join('\n\n');

    const messages: ChatMessage[] = [
      {
        id: `system_${Date.now()}`,
        content: `You are ${agent.name}, a ${agent.role}. Your task is to synthesize multiple results into a comprehensive, unified solution.`,
        role: 'system',
        timestamp: new Date()
      },
      {
        id: `synthesize_${Date.now()}`,
        content: `Task: ${task.title}\nDescription: ${task.description}\n\n${synthesisPrompt}\n\nPlease synthesize these results into a cohesive, comprehensive solution that addresses all aspects of the task.`,
        role: 'user',
        timestamp: new Date()
      }
    ];

    const response = await aiProviderService.sendMessage({
      messages,
      model: agent.config.primaryProvider,
      temperature: 0.3,
      maxTokens: agent.config.maxTokens
    });

    return {
      output: response.content,
      files: [],
      success: true,
      metadata: {
        agent: agent.id,
        model: response.model,
        tokens: response.usage.totalTokens,
        synthesizedFrom: results.length,
        processingTime: Date.now() - new Date().getTime()
      }
    };
  }

  private parseSubtasksFromPlan(plan: string): Array<Task & { assignedAgent: string }> {
    // Simple parsing - in production, this would use more sophisticated NLP
    const subtasks: Array<Task & { assignedAgent: string }> = [];
    
    // Look for patterns like "Subtask 1: ..." or "1. ..."
    const lines = plan.split('\n');
    let currentSubtask = '';
    
    for (const line of lines) {
      const match = line.match(/(?:subtask\s+)?(\d+)[:.]\s*(.+)/i);
      if (match) {
        if (currentSubtask) {
          subtasks.push({
            id: `subtask_${Date.now()}_${subtasks.length}`,
            title: currentSubtask,
            description: currentSubtask,
            type: 'code',
            priority: 'medium',
            status: 'pending',
            projectId: 'temp',
            dependencies: [],
            estimatedTime: 300,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedAgent: this.selectAgentForSubtask(currentSubtask)
          });
        }
        currentSubtask = match[2];
      }
    }
    
    // Add last subtask
    if (currentSubtask) {
      subtasks.push({
        id: `subtask_${Date.now()}_${subtasks.length}`,
        title: currentSubtask,
        description: currentSubtask,
        type: 'code',
        priority: 'medium',
        status: 'pending',
        projectId: 'temp',
        dependencies: [],
        estimatedTime: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedAgent: this.selectAgentForSubtask(currentSubtask)
      });
    }
    
    return subtasks;
  }

  private selectAgentForSubtask(subtask: string): string {
    // Simple agent selection based on subtask content
    const availableAgents = Array.from(this.agents.values()).filter(agent => agent.isActive);
    
    if (subtask.toLowerCase().includes('design') || subtask.toLowerCase().includes('ui')) {
      const designer = availableAgents.find(agent => agent.role === 'UI/UX Design');
      return designer?.id || availableAgents[0]?.id || '';
    }
    
    if (subtask.toLowerCase().includes('test') || subtask.toLowerCase().includes('debug')) {
      const tester = availableAgents.find(agent => agent.role === 'Quality Assurance');
      return tester?.id || availableAgents[0]?.id || '';
    }
    
    if (subtask.toLowerCase().includes('deploy') || subtask.toLowerCase().includes('ci')) {
      const devops = availableAgents.find(agent => agent.role === 'Deployment & CI/CD');
      return devops?.id || availableAgents[0]?.id || '';
    }
    
    // Default to coder
    const coder = availableAgents.find(agent => agent.role === 'Code Generation');
    return coder?.id || availableAgents[0]?.id || '';
  }

  private async reachConsensus(primaryAgent: Agent, task: Task, proposals: TaskResult[]): Promise<TaskResult> {
    // Create negotiation
    const negotiation: AgentNegotiation = {
      id: `negotiation_${task.id}_${Date.now()}`,
      topic: task.title,
      participants: proposals.map((_, index) => this.agents.keys().toArray()[index]),
      proposals: proposals.map((proposal, index) => ({
        id: `proposal_${index}`,
        agentId: this.agents.keys().toArray()[index],
        content: proposal.output,
        confidence: 0.8,
        priority: 1,
        timestamp: new Date(),
        votes: []
      })),
      status: 'initiated',
      startTime: new Date()
    };

    this.negotiations.set(negotiation.id, negotiation);

    // Simulate consensus process (in production, this would involve actual agent communication)
    const bestProposal = proposals.reduce((best, current) => 
      current.metadata.tokens || 0 > (best.metadata.tokens || 0) ? current : best
    );

    negotiation.status = 'agreed';
    negotiation.resolution = bestProposal;
    negotiation.endTime = new Date();

    return bestProposal;
  }

  private async handleTaskError(task: Task, agent: Agent, error: any): Promise<void> {
    task.status = 'failed';
    task.result = {
      output: '',
      files: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {}
    };
    
    agent.status = 'error';
    agent.currentTask = undefined;

    await storageService.saveTask(task);
    await this.saveAgent(agent);

    // Send error notification
    await this.sendAgentMessage({
      fromAgentId: agent.id,
      toAgentId: 'broadcast',
      type: 'status',
      content: `Task failed: ${task.title}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      priority: 'high',
      metadata: { taskId: task.id, error: error instanceof Error ? error.message : 'Unknown error' },
      responseExpected: false,
      relatedTaskId: task.id
    });
  }

  private async sendAgentMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.messageQueue.push(fullMessage);
    this.analytics.interAgentMessages++;
  }

  private async processMessageQueue(): Promise<void> {
    if (this.processingMessages || this.messageQueue.length === 0) return;

    this.processingMessages = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.processAgentMessage(message);
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.processingMessages = false;
    }
  }

  private async processAgentMessage(message: AgentMessage): Promise<void> {
    // Handle different message types
    switch (message.type) {
      case 'coordination':
        await this.handleCoordinationMessage(message);
        break;
      case 'status':
        await this.handleStatusMessage(message);
        break;
      case 'request':
        await this.handleRequestMessage(message);
        break;
      case 'response':
        await this.handleResponseMessage(message);
        break;
      case 'delegation':
        await this.handleDelegationMessage(message);
        break;
      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  }

  private async handleCoordinationMessage(message: AgentMessage): Promise<void> {
    // Handle coordination messages for collaboration setup
    const collaborationId = message.metadata.collaborationId;
    const collaboration = this.collaborations.get(collaborationId);
    
    if (collaboration) {
      collaboration.messages.push(message);
      
      // Notify participants
      for (const participantId of collaboration.participants) {
        const participant = this.agents.get(participantId);
        if (participant) {
          // In a real implementation, this would trigger agent-specific handling
          console.log(`Notified ${participant.name} about collaboration`);
        }
      }
    }
  }

  private async handleStatusMessage(message: AgentMessage): Promise<void> {
    // Handle status updates from agents
    console.log(`Status update from ${message.fromAgentId}: ${message.content}`);
    
    // Update collaboration if applicable
    for (const collaboration of this.collaborations.values()) {
      if (collaboration.participants.includes(message.fromAgentId)) {
        collaboration.messages.push(message);
      }
    }
  }

  private async handleRequestMessage(message: AgentMessage): Promise<void> {
    // Handle request messages between agents
    const targetAgent = this.agents.get(message.toAgentId);
    if (targetAgent && message.responseExpected) {
      // Generate response (simplified)
      const response: AgentMessage = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromAgentId: message.toAgentId,
        toAgentId: message.fromAgentId,
        type: 'response',
        content: `Response to request: ${message.content}`,
        priority: message.priority,
        timestamp: new Date(),
        metadata: { requestId: message.id },
        responseExpected: false,
        relatedTaskId: message.relatedTaskId
      };

      this.messageQueue.push(response);
    }
  }

  private async handleResponseMessage(message: AgentMessage): Promise<void> {
    // Handle response messages
    console.log(`Response from ${message.fromAgentId} to ${message.toAgentId}`);
    
    // Update collaboration or negotiation as needed
    const requestId = message.metadata.requestId;
    // Find and update the original request
  }

  private async handleDelegationMessage(message: AgentMessage): Promise<void> {
    // Handle task delegation between agents
    const targetAgent = this.agents.get(message.toAgentId);
    if (targetAgent) {
      console.log(`Task delegated from ${message.fromAgentId} to ${targetAgent.name}`);
      
      // Update agent status
      targetAgent.status = 'working';
      await this.saveAgent(targetAgent);
    }
  }

  private async performMaintenance(): Promise<void> {
    console.log('Performing orchestrator maintenance...');
    
    // Clean up old collaborations
    const now = Date.now();
    const collaborationTimeout = this.orchestratorConfig.collaborationTimeout;
    
    for (const [collabId, collaboration] of this.collaborations) {
      if (now - collaboration.startTime.getTime() > collaborationTimeout) {
        if (collaboration.status === 'in_progress') {
          collaboration.status = 'failed';
        }
      }
    }
    
    // Clean up old negotiations
    const negotiationTimeout = this.orchestratorConfig.negotiationTimeout;
    
    for (const [negId, negotiation] of this.negotiations) {
      if (now - negotiation.startTime.getTime() > negotiationTimeout) {
        if (negotiation.status === 'negotiating') {
          negotiation.status = 'failed';
        }
      }
    }
    
    // Update agent specializations if learning is enabled
    if (this.orchestratorConfig.enableLearning) {
      await this.updateAgentSpecializations();
    }
    
    // Save data
    await this.saveOrchestratorData();
    
    console.log('Maintenance completed');
  }

  private async updateAgentSpecializations(): Promise<void> {
    // Update agent specializations based on performance and collaboration history
    for (const [agentId, agent] of this.agents) {
      let specialization = this.specializations.get(agentId);
      
      if (!specialization) {
        specialization = {
          agentId,
          specializations: [...agent.capabilities],
          expertise: {},
          performance: {},
          collaborationHistory: [],
          preferredPartners: [],
          avoidedPartners: []
        };
      }
      
      // Update expertise based on task completion
      specialization.performance.successRate = agent.performance.successRate;
      specialization.performance.qualityScore = agent.performance.qualityScore;
      
      // Update collaboration history
      const recentCollaborations = Array.from(this.collaborations.values())
        .filter(collab => collab.participants.includes(agentId))
        .map(collab => collab.id);
      
      specialization.collaborationHistory = recentCollaborations;
      
      this.specializations.set(agentId, specialization);
    }
  }

  private async saveOrchestratorData(): Promise<void> {
    try {
      const data = await storageService.getVectorDatabaseData() || {};
      data.collaborations = Array.from(this.collaborations.entries());
      data.negotiations = Array.from(this.negotiations.entries());
      data.agentSpecializations = Array.from(this.specializations.entries());
      data.analytics = this.analytics;
      
      await storageService.saveVectorDatabaseData(data);
    } catch (error) {
      console.error('Failed to save orchestrator data:', error);
    }
  }

  private async saveAgent(agent: Agent): Promise<void> {
    await storageService.saveAgent(agent);
  }

  private calculateSuccessRate(agent: Agent): number {
    return Math.min(agent.performance.successRate + 0.01, 0.99);
  }

  private updateAverageTime(agent: Agent, newTime: number): number {
    if (agent.performance.tasksCompleted === 1) {
      return newTime;
    }
    return (agent.performance.averageTime * (agent.performance.tasksCompleted - 1) + newTime) / agent.performance.tasksCompleted;
  }

  private updateAverageTaskTime(newTime: number): number {
    if (this.analytics.totalTasksProcessed === 1) {
      return newTime;
    }
    return (this.analytics.averageTaskTime * (this.analytics.totalTasksProcessed - 1) + newTime) / this.analytics.totalTasksProcessed;
  }

  async getOrchestratorAnalytics(): Promise<OrchestratorAnalytics> {
    // Update agent utilization
    for (const [agentId, agent] of this.agents) {
      this.analytics.agentUtilization[agentId] = agent.status === 'working' ? 1 : 0;
    }
    
    return { ...this.analytics };
  }

  async getAgentStatus(agentId: string): Promise<{
    agent: Agent | null;
    currentTask: Task | null;
    collaborations: string[];
    recentMessages: AgentMessage[];
  }> {
    const agent = this.agents.get(agentId) || null;
    const currentTask = agent?.currentTask || null;
    
    const collaborations = Array.from(this.collaborations.values())
      .filter(collab => collab.participants.includes(agentId))
      .map(collab => collab.id);
    
    const recentMessages = this.messageQueue
      .filter(msg => msg.fromAgentId === agentId || msg.toAgentId === agentId)
      .slice(-10);
    
    return {
      agent,
      currentTask,
      collaborations,
      recentMessages
    };
  }

  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.orchestratorConfig = { ...this.orchestratorConfig, ...config };
  }

  getConfig(): OrchestratorConfig {
    return { ...this.orchestratorConfig };
  }
}

export const enhancedAgentOrchestrator = new EnhancedAgentOrchestrator();