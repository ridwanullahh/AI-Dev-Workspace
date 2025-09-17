// Core Types for AI Development Workspace
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'cohere' | 'local';
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited';
  accounts: AIAccount[];
  config: ProviderConfig;
}

export interface AIAccount {
  id: string;
  providerId: string;
  name: string;
  apiKey?: string;
  oauthToken?: string;
  rateLimit: RateLimit;
  usage: Usage;
  isActive: boolean;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  currentRequests: number;
  currentTokens: number;
  resetTime: Date;
}

export interface Usage {
  requestsToday: number;
  tokensToday: number;
  costToday: number;
  lastUsed: Date;
  totalRequests: number;
  totalTokens: number;
}

export interface ProviderConfig {
  baseURL?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'react-native' | 'web' | 'node' | 'python' | 'ai-service';
  status: 'active' | 'paused' | 'completed' | 'archived';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  files: ProjectFile[];
  gitRepository?: GitRepository;
  aiContext: AIContext;
  agents: AgentAssignment[];
}

export interface ProjectFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
  embeddings?: number[];
  isGenerated: boolean;
}

export interface GitIntegration {
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

export interface GitRepository {
  id: string;
  projectId: string;
  name: string;
  url: string;
  branch: string;
  lastCommit: string;
  isClean: boolean;
  remoteStatus: 'synced' | 'ahead' | 'behind' | 'diverged';
}

export interface AIContext {
  projectSummary: string;
  codebaseEmbeddings: Map<string, number[]>;
  conversationHistory: ChatMessage[];
  knowledgeGraph: KnowledgeNode[];
  activeMemory: ContextMemory[];
}

export interface KnowledgeNode {
  id: string;
  type: 'file' | 'function' | 'concept' | 'pattern' | 'edge' | 'cluster';
  content: string;
  connections: string[];
  embedding: number[];
  relevanceScore: number;
  metadata: Record<string, any>;
  projectId: string;
}

export interface ContextMemory {
  id: string;
  content: string;
  type: 'code' | 'conversation' | 'decision' | 'pattern';
  timestamp: Date;
  relevanceScore: number;
  embedding: number[];
  metadata: Record<string, any>;
  projectId: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  isActive: boolean;
  status: 'idle' | 'working' | 'error' | 'paused';
  currentTask?: Task;
  performance: AgentPerformance;
  config: AgentConfig;
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number;
  averageTime: number;
  qualityScore: number;
  userRating: number;
}

export interface AgentConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'code' | 'design' | 'debug' | 'test' | 'deploy' | 'analyze';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  assignedAgent?: string;
  projectId: string;
  dependencies: string[];
  estimatedTime: number;
  actualTime?: number;
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResult {
  output: string;
  files: ProjectFile[];
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
}

export interface AgentAssignment {
  agentId: string;
  projectId: string;
  role: string;
  isActive: boolean;
  tasksAssigned: number;
  tasksCompleted: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  agentId?: string;
  projectId?: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    cost?: number;
    attachments?: string[];
    source?: string;
  };
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  type: 'file' | 'function' | 'conversation' | 'knowledge';
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  isLoaded: boolean;
  model?: any;
}

export interface SearchIndex {
  id: string;
  type: 'semantic' | 'keyword' | 'hybrid';
  entries: IndexEntry[];
  lastUpdated: Date;
}

export interface IndexEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  keywords: string[];
}