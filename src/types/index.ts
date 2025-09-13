// Core Types for AI Development Workspace - Web Version
export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'cohere' | 'local'
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited'
  accounts: AIAccount[]
  config: ProviderConfig
}

export interface AIAccount {
  id: string
  providerId: string
  name: string
  apiKey?: string
  oauthToken?: string
  rateLimit: RateLimit
  usage: Usage
  isActive: boolean
}

export interface RateLimit {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  tokensPerMinute: number
  currentRequests: number
  currentTokens: number
  resetTime: string // ISO string
}

export interface Usage {
  requestsToday: number
  tokensToday: number
  costToday: number
  lastUsed: string // ISO string
  totalRequests: number
  totalTokens: number
}

export interface ProviderConfig {
  baseURL?: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface Project {
  id: string
  name: string
  description: string
  type: 'react-native' | 'web' | 'node' | 'python' | 'ai-service'
  status: 'active' | 'paused' | 'completed' | 'archived'
  progress: number
  createdAt: string // ISO string
  updatedAt: string // ISO string
  files: ProjectFile[]
  gitRepository?: GitRepository
  aiContext: AIContext
  agents: AgentAssignment[]
}

export interface ProjectFile {
  id: string
  path: string
  name: string
  content: string
  language: string
  size: number
  lastModified: string // ISO string
  embeddings?: number[]
  isGenerated: boolean
}

export interface GitRepository {
  id: string
  url: string
  branch: string
  lastCommit: string
  isClean: boolean
  remoteStatus: 'synced' | 'ahead' | 'behind' | 'diverged'
}

export interface AIContext {
  projectSummary: string
  codebaseEmbeddings: Map<string, number[]>
  conversationHistory: ChatMessage[]
  knowledgeGraph: KnowledgeNode[]
  activeMemory: ContextMemory[]
}

export interface KnowledgeNode {
  id: string
  type: 'file' | 'function' | 'concept' | 'pattern'
  content: string
  connections: string[]
  embedding: number[]
  relevanceScore: number
}

export interface ContextMemory {
  id: string
  content: string
  type: 'code' | 'conversation' | 'decision' | 'pattern'
  timestamp: string // ISO string
  relevanceScore: number
  embedding: number[]
}

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  capabilities: string[]
  isActive: boolean
  status: 'idle' | 'working' | 'error' | 'paused'
  currentTask?: string
  performance: AgentPerformance
  config: AgentConfig
}

export interface AgentPerformance {
  tasksCompleted: number
  successRate: number
  averageTime: number
  qualityScore: number
  userRating: number
}

export interface AgentConfig {
  primaryProvider: string
  fallbackProviders: string[]
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
}

export interface Task {
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
  result?: TaskResult
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

export interface TaskResult {
  output: string
  files: ProjectFile[]
  success: boolean
  error?: string
  metadata: Record<string, any>
}

export interface AgentAssignment {
  id: string
  agentId: string
  role: string
  isActive: boolean
  tasksAssigned: number
  tasksCompleted: number
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string
  projectId?: string
  timestamp: string // ISO string
  metadata?: {
    model?: string
    provider?: string
    tokens?: number
    cost?: number
    attachments?: string[]
    source?: string
  }
}

export interface VectorSearchResult {
  id: string
  content: string
  score: number
  metadata: Record<string, any>
  type: 'file' | 'function' | 'conversation' | 'knowledge'
}

export interface EmbeddingModel {
  name: string
  dimensions: number
  isLoaded: boolean
  model?: any
}

export interface SearchIndex {
  id: string
  type: 'semantic' | 'keyword' | 'hybrid'
  entries: IndexEntry[]
  lastUpdated: Date
}

export interface IndexEntry {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, any>
  keywords: string[]
}

// AI Request/Response types
export interface AIRequest {
  messages: Array<{ role: string; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
  provider?: string
}

export interface AIResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  provider: string
}

// UI Component Types
export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  currentProvider: string
}

export interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
}

export interface AgentState {
  agents: Agent[]
  activeAgents: string[]
  isLoading: boolean
  error: string | null
}

// Store Types
export interface WorkspaceState {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  projects: Project[]
  currentProject: Project | null
  providers: AIProvider[]
  currentProvider: string
  agents: Agent[]
  messages: ChatMessage[]
  tasks: Task[]
}

export interface WorkspaceActions {
  initialize: () => Promise<void>
  setCurrentProject: (project: Project | null) => void
  setCurrentProvider: (providerId: string) => void
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>
  updateMessage: (id: string, updates: Partial<ChatMessage>) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

// Search and Filter Types
export interface SearchFilters {
  type?: 'all' | 'files' | 'messages' | 'tasks' | 'agents'
  projectId?: string
  dateRange?: {
    start: string
    end: string
  }
  agentId?: string
  status?: string
}

export interface SearchResult {
  id: string
  type: 'file' | 'message' | 'task' | 'agent'
  title: string
  content: string
  score: number
  metadata: Record<string, any>
}

// OAuth Types
export interface OAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  authorizationEndpoint: string
  tokenEndpoint: string
}

export interface OAuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: string
  scope: string
}

export interface OAuthAccount {
  id: string
  provider: string
  email: string
  name: string
  picture?: string
  tokens: OAuthToken
  isActive: boolean
}

// File System Types
export interface FileSystemEntry {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  lastModified: string
  content?: string
  language?: string
  children?: FileSystemEntry[]
}

export interface FileOperationResult {
  success: boolean
  path?: string
  error?: string
  metadata?: Record<string, any>
}

// Terminal Types
export interface TerminalSession {
  id: string
  title: string
  cwd: string
  history: string[]
  historyIndex: number
  isActive: boolean
}

export interface TerminalCommand {
  command: string
  args: string[]
  cwd: string
  output?: string
  error?: string
  exitCode?: number
  timestamp: string
}

// Git Types
export interface GitCommit {
  hash: string
  message: string
  author: string
  timestamp: string
  files: string[]
}

export interface GitBranch {
  name: string
  isCurrent: boolean
  isRemote: boolean
  commit: string
}

export interface GitStatus {
  branch: string
  isClean: boolean
  staged: string[]
  unstaged: string[]
  untracked: string[]
  ahead: number
  behind: number
}