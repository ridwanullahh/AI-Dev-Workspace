import Dexie, { Table } from 'dexie'

// Database interface definitions
export interface ProjectDB {
  id: string
  name: string
  description: string
  type: 'react-native' | 'web' | 'node' | 'python' | 'ai-service'
  status: 'active' | 'paused' | 'completed' | 'archived'
  progress: number
  createdAt: Date
  updatedAt: Date
  files: ProjectFileDB[]
  gitRepository?: GitRepositoryDB
  aiContext: AIContextDB
  agents: AgentAssignmentDB[]
}

export interface ProjectFileDB {
  id: string
  projectId: string
  path: string
  name: string
  content: string
  language: string
  size: number
  lastModified: Date
  embeddings?: number[]
  isGenerated: boolean
}

export interface GitRepositoryDB {
  id: string
  projectId: string
  name: string
  url: string
  branch: string
  lastCommit: string
  isClean: boolean
  remoteStatus: 'synced' | 'ahead' | 'behind' | 'diverged'
}

export interface AIContextDB {
  projectId: string
  projectSummary: string
  codebaseEmbeddings: Record<string, number[]>
  conversationHistory: ChatMessageDB[]
  knowledgeGraph: KnowledgeNodeDB[]
  activeMemory: ContextMemoryDB[]
}

export interface KnowledgeNodeDB {
  id: string
  projectId: string
  type: 'file' | 'function' | 'concept' | 'pattern' | 'edge' | 'cluster'
  content: string
  connections: string[]
  embedding: number[]
  relevanceScore: number
  metadata: Record<string, any>
}

export interface ContextMemoryDB {
  id: string
  projectId: string
  content: string
  type: 'code' | 'conversation' | 'decision' | 'pattern'
  timestamp: Date
  relevanceScore: number
  embedding: number[]
  metadata: Record<string, any>
}

export interface AgentAssignmentDB {
  id: string
  projectId: string
  agentId: string
  role: string
  isActive: boolean
  tasksAssigned: number
  tasksCompleted: number
}

export interface AIProviderDB {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'cohere' | 'local'
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited'
  accounts: AIAccountDB[]
  config: ProviderConfigDB
}

export interface AIAccountDB {
  id: string
  providerId: string
  name: string
  apiKey?: string
  oauthToken?: string
  rateLimit: RateLimitDB
  usage: UsageDB
  isActive: boolean
}

export interface RateLimitDB {
  accountId: string
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  tokensPerMinute: number
  currentRequests: number
  currentTokens: number
  resetTime: Date
}

export interface UsageDB {
  accountId: string
  requestsToday: number
  tokensToday: number
  costToday: number
  lastUsed: Date
  totalRequests: number
  totalTokens: number
}

export interface ProviderConfigDB {
  providerId: string
  baseURL?: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface AgentDB {
  id: string
  name: string
  role: string
  description: string
  capabilities: string[]
  isActive: boolean
  status: 'idle' | 'working' | 'error' | 'paused'
  currentTask?: string
  performance: AgentPerformanceDB
  config: AgentConfigDB
}

export interface AgentPerformanceDB {
  agentId: string
  tasksCompleted: number
  successRate: number
  averageTime: number
  qualityScore: number
  userRating: number
}

export interface AgentConfigDB {
  agentId: string
  primaryProvider: string
  fallbackProviders: string[]
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
}

export interface TaskDB {
  id: string
  title: string
  description: string
  type: 'code' | 'design' | 'debug' | 'test' | 'deploy' | 'analyze'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  assignedAgent?: string
  projectId: string
  dependencies: string[]
  estimatedTime: number
  actualTime?: number
  result?: TaskResultDB
  createdAt: Date
  updatedAt: Date
}

export interface TaskResultDB {
  taskId: string
  output: string
  files: ProjectFileDB[]
  success: boolean
  error?: string
  metadata: Record<string, any>
}

export interface ChatMessageDB {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string
  projectId?: string
  timestamp: Date
  metadata?: {
    model?: string
    provider?: string
    tokens?: number
    cost?: number
    attachments?: string[]
    source?: string
  }
}

export interface VectorIndexDB {
  id: string
  type: 'semantic' | 'keyword' | 'hybrid'
  entries: IndexEntryDB[]
  lastUpdated: Date
}

export interface IndexEntryDB {
   id: string
   indexId: string
   content: string
   embedding: number[]
   metadata: Record<string, any>
   keywords: string[]
}

// Performance Monitoring Database Interfaces
export interface PerformanceMetricDB {
   id: string
   type: 'response_time' | 'memory_usage' | 'cpu_usage' | 'network_request' | 'cache_hit' | 'error_rate'
   service: string
   value: number
   unit: string
   timestamp: Date
   metadata: Record<string, any>
}

export interface WebVitalDB {
   id: string
   metric: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB'
   value: number
   rating: 'good' | 'needs-improvement' | 'poor'
   timestamp: Date
   url: string
   metadata: Record<string, any>
}

export interface ErrorLogDB {
   id: string
   level: 'error' | 'warning' | 'info'
   message: string
   stack?: string
   component?: string
   service: string
   timestamp: Date
   userAgent: string
   url: string
   metadata: Record<string, any>
}

// Main database class
export class AIDevWorkspaceDB extends Dexie {
  // Tables
  projects!: Table<ProjectDB, string>
  projectFiles!: Table<ProjectFileDB, string>
  gitRepositories!: Table<GitRepositoryDB, string>
  aiContexts!: Table<AIContextDB, string>
  knowledgeNodes!: Table<KnowledgeNodeDB, string>
  contextMemories!: Table<ContextMemoryDB, string>
  agentAssignments!: Table<AgentAssignmentDB, string>
  
  aiProviders!: Table<AIProviderDB, string>
  aiAccounts!: Table<AIAccountDB, string>
  rateLimits!: Table<RateLimitDB, string>
  usages!: Table<UsageDB, string>
  providerConfigs!: Table<ProviderConfigDB, string>
  
  agents!: Table<AgentDB, string>
  agentPerformances!: Table<AgentPerformanceDB, string>
  agentConfigs!: Table<AgentConfigDB, string>
  
  tasks!: Table<TaskDB, string>
  taskResults!: Table<TaskResultDB, string>
  
  chatMessages!: Table<ChatMessageDB, string>
  
  vectorIndexes!: Table<VectorIndexDB, string>
  indexEntries!: Table<IndexEntryDB, string>
  vectorDatabase!: Table<any, number>;

  // Performance monitoring tables
  performanceMetrics!: Table<PerformanceMetricDB, string>
  webVitals!: Table<WebVitalDB, string>
  errorLogs!: Table<ErrorLogDB, string>

  constructor() {
    super('AIDevWorkspaceDB')
    
    this.version(1).stores({
      // Project related tables
      projects: 'id, name, type, status, createdAt, updatedAt',
      projectFiles: 'id, projectId, path, language, lastModified',
      gitRepositories: 'id, projectId, url, branch',
      aiContexts: 'projectId',
      knowledgeNodes: 'id, projectId, type',
      contextMemories: 'id, projectId, type',
      agentAssignments: 'id, projectId, agentId',
      
      // AI Provider related tables
      aiProviders: 'id, name, type, status',
      aiAccounts: 'id, providerId, isActive',
      rateLimits: 'accountId',
      usages: 'accountId',
      providerConfigs: 'providerId',
      
      // Agent related tables
      agents: 'id, name, role, status, isActive',
      agentPerformances: 'agentId',
      agentConfigs: 'agentId',
      
      // Task related tables
      tasks: 'id, projectId, type, status, priority, assignedAgent',
      taskResults: 'taskId',
      
      // Chat related tables
      chatMessages: 'id, role, projectId, agentId, timestamp',
      
      // Vector search related tables
      vectorIndexes: 'id, type, lastUpdated',
      indexEntries: 'id, indexId',
      vectorDatabase: 'id'
    })
    
    this.version(2).stores({
      // Add indexes for better performance
      projects: 'id, name, type, status, createdAt, updatedAt',
      projectFiles: 'id, projectId, path, language, lastModified, [projectId+path]',
      gitRepositories: 'id, projectId, url, branch',
      aiContexts: 'projectId',
      knowledgeNodes: 'id, projectId, type, [projectId+type]',
      contextMemories: 'id, projectId, type, [projectId+type]',
      agentAssignments: 'id, projectId, agentId, [projectId+agentId]',
      
      aiProviders: 'id, name, type, status',
      aiAccounts: 'id, providerId, isActive, [providerId+isActive]',
      rateLimits: 'accountId, resetTime',
      usages: 'accountId, lastUsed',
      providerConfigs: 'providerId',
      
      agents: 'id, name, role, status, isActive',
      agentPerformances: 'agentId',
      agentConfigs: 'agentId',
      
      tasks: 'id, projectId, type, status, priority, assignedAgent, [projectId+status]',
      taskResults: 'taskId',
      
      chatMessages: 'id, role, projectId, agentId, timestamp, [projectId+timestamp]',
      
      vectorIndexes: 'id, type, lastUpdated',
      indexEntries: 'id, indexId, [indexId+id]',
      vectorDatabase: 'id',

      // Performance monitoring tables
      performanceMetrics: 'id, type, service, timestamp',
      webVitals: 'id, metric, rating, timestamp',
      errorLogs: 'id, level, service, timestamp'
    }).upgrade(async (tx) => {
      // Migration logic if needed
      console.log('Upgrading database to version 2')
    })
  }
}

// Create database instance
export const db = new AIDevWorkspaceDB()

// Initialize database
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    throw error
  }
}

// Helper functions for common operations
export async function clearAllData(): Promise<void> {
  try {
    await db.delete()
    await db.open()
    console.log('✅ All data cleared successfully')
  } catch (error) {
    console.error('❌ Failed to clear data:', error)
    throw error
  }
}

export async function getDatabaseStats(): Promise<{
  projects: number
  files: number
  messages: number
  tasks: number
  agents: number
  providers: number
  totalSize: number
}> {
  try {
    const [
      projectsCount,
      filesCount,
      messagesCount,
      tasksCount,
      agentsCount,
      providersCount
    ] = await Promise.all([
      db.projects.count(),
      db.projectFiles.count(),
      db.chatMessages.count(),
      db.tasks.count(),
      db.agents.count(),
      db.aiProviders.count()
    ])

    // Estimate total size (rough calculation)
    const totalSize = projectsCount * 1000 + // ~1KB per project
                     filesCount * 5000 +    // ~5KB per file
                     messagesCount * 1000 + // ~1KB per message
                     tasksCount * 2000 +    // ~2KB per task
                     agentsCount * 3000 +   // ~3KB per agent
                     providersCount * 2000 // ~2KB per provider

    return {
      projects: projectsCount,
      files: filesCount,
      messages: messagesCount,
      tasks: tasksCount,
      agents: agentsCount,
      providers: providersCount,
      totalSize
    }
  } catch (error) {
    console.error('❌ Failed to get database stats:', error)
    throw error
  }
}