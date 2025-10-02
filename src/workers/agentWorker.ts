// Web Worker for AI Agent Execution
// Runs agents in background without blocking main thread

import type { Agent, Task, TaskArtifact } from '../services/agentOrchestra';

interface WorkerMessage {
  type: 'execute-task' | 'cancel-task' | 'health-check';
  taskId?: string;
  agent?: Agent;
  task?: Task;
  context?: any;
}

interface WorkerResponse {
  type: 'task-started' | 'task-progress' | 'task-completed' | 'task-failed' | 'health-status';
  taskId?: string;
  progress?: number;
  artifacts?: TaskArtifact[];
  error?: string;
  status?: 'healthy' | 'degraded';
}

// Store active tasks
const activeTasks = new Map<string, AbortController>();

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, taskId, agent, task, context } = event.data;

  switch (type) {
    case 'execute-task':
      if (task && agent) {
        await executeTask(task, agent, context);
      }
      break;

    case 'cancel-task':
      if (taskId) {
        cancelTask(taskId);
      }
      break;

    case 'health-check':
      postMessage({
        type: 'health-status',
        status: 'healthy'
      } as WorkerResponse);
      break;
  }
});

async function executeTask(task: Task, agent: Agent, context: any) {
  const controller = new AbortController();
  activeTasks.set(task.id, controller);

  try {
    // Notify task started
    postMessage({
      type: 'task-started',
      taskId: task.id
    } as WorkerResponse);

    // Build prompt for AI
    const prompt = buildPrompt(agent, task, context);

    // Execute AI request
    const response = await makeAIRequest(prompt, agent, controller.signal);

    // Parse response and generate artifacts
    const artifacts = parseArtifacts(response, task.type);

    // Report progress
    postMessage({
      type: 'task-progress',
      taskId: task.id,
      progress: 100
    } as WorkerResponse);

    // Notify completion
    postMessage({
      type: 'task-completed',
      taskId: task.id,
      artifacts
    } as WorkerResponse);

  } catch (error) {
    postMessage({
      type: 'task-failed',
      taskId: task.id,
      error: error instanceof Error ? error.message : 'Task execution failed'
    } as WorkerResponse);
  } finally {
    activeTasks.delete(task.id);
  }
}

function cancelTask(taskId: string) {
  const controller = activeTasks.get(taskId);
  if (controller) {
    controller.abort();
    activeTasks.delete(taskId);
  }
}

function buildPrompt(agent: Agent, task: Task, context: any): string {
  let prompt = `${agent.systemPrompt}\n\n`;
  
  prompt += `Task: ${task.title}\n`;
  prompt += `Description: ${task.description}\n`;
  prompt += `Type: ${task.type}\n\n`;

  if (context) {
    prompt += `Context:\n`;
    
    if (context.project) {
      prompt += `Project: ${context.project.name}\n`;
      prompt += `Type: ${context.project.type}\n`;
    }

    if (context.files && context.files.length > 0) {
      prompt += `\nRelevant Files:\n`;
      context.files.slice(0, 5).forEach((file: any) => {
        prompt += `- ${file.path}\n`;
      });
    }

    if (context.recentConversations && context.recentConversations.length > 0) {
      prompt += `\nRecent Discussions:\n`;
      context.recentConversations.slice(0, 3).forEach((chat: any) => {
        prompt += `${chat.role}: ${chat.content.substring(0, 100)}...\n`;
      });
    }

    if (context.relevantMemories && context.relevantMemories.length > 0) {
      prompt += `\nRelevant Context:\n`;
      context.relevantMemories.forEach((memory: any) => {
        prompt += `- ${memory.content.substring(0, 150)}...\n`;
      });
    }
  }

  prompt += `\nPlease provide a detailed response for this ${task.type} task.`;

  return prompt;
}

async function makeAIRequest(prompt: string, agent: Agent, signal: AbortSignal): Promise<string> {
  // In a real implementation, this would call the AI API
  // For now, simulate with a delay
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(`[Agent: ${agent.name}] Task completed successfully.\n\nGenerated response for the task.`);
    }, 2000);

    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Task cancelled'));
    });
  });
}

function parseArtifacts(response: string, taskType: Task['type']): TaskArtifact[] {
  const artifacts: TaskArtifact[] = [];

  // Extract code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();

    artifacts.push({
      id: `artifact_${Date.now()}_${index}`,
      type: determineArtifactType(language, taskType),
      name: `Generated ${language} ${index + 1}`,
      content,
      metadata: {
        language,
        taskType,
        generatedAt: Date.now()
      }
    });

    index++;
  }

  // If no code blocks, create documentation artifact
  if (artifacts.length === 0) {
    artifacts.push({
      id: `artifact_${Date.now()}_0`,
      type: 'documentation',
      name: 'Response',
      content: response,
      metadata: {
        taskType,
        generatedAt: Date.now()
      }
    });
  }

  return artifacts;
}

function determineArtifactType(language: string, taskType: Task['type']): TaskArtifact['type'] {
  // Determine artifact type based on language and task type
  if (language === 'json' || language === 'yaml' || language === 'toml') {
    return 'config';
  }

  if (taskType === 'analysis' || taskType === 'review') {
    return 'documentation';
  }

  if (language.includes('test') || language.includes('spec')) {
    return 'test';
  }

  return 'code';
}

// Periodic health check
setInterval(() => {
  postMessage({
    type: 'health-status',
    status: activeTasks.size > 5 ? 'degraded' : 'healthy'
  } as WorkerResponse);
}, 30000);

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse };
