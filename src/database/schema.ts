import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

// Database Schemas
export interface Account {
  id: string;
  providerId: string;
  email: string;
  name: string;
  encryptedTokens: string; // Encrypted JSON of tokens
  priority: number;
  weight: number;
  isActive: boolean;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    tokensPerMinute: number;
  };
  usage: {
    requestsToday: number;
    tokensToday: number;
    lastReset: Date;
  };
  health: {
    status: 'healthy' | 'degraded' | 'failed';
    lastCheck: Date;
    errorCount: number;
    circuitBreakerOpen: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'library' | 'other';
  status: 'active' | 'archived' | 'template';
  gitConfig: {
    localPath: string;
    remoteUrl?: string;
    branch: string;
    lastSync?: Date;
    githubRepoId?: number;
    githubRepoName?: string;
    githubRepoFullName?: string;
    isConnected: boolean;
  };
  settings: {
    aiProvider: string;
    agents: string[];
    features: string[];
  };
  metadata: {
    tags: string[];
    framework?: string;
    language?: string;
    size: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FileEntry {
  id: string;
  projectId: string;
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  type: 'file' | 'directory';
  size: number;
  hash: string;
  isDirty: boolean;
  isStaged: boolean;
  lastModified: Date;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  projectId?: string;
  threadId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  metadata?: {
    provider?: string;
    model?: string;
    tokens?: number;
    cost?: number;
    streaming?: boolean;
    tools?: any[];
    attachments?: string[];
    source?: string;
  };
  timestamp: Date;
}

export interface Todo {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgentId?: string;
  dependencies: string[];
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Terminal {
  id: string;
  projectId: string;
  name: string;
  cwd: string;
  history: Array<{
    command: string;
    output: string;
    timestamp: Date;
    exitCode: number;
  }>;
  environment: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
}

export interface Memory {
  id: string;
  projectId: string;
  type: 'conversation' | 'code' | 'decision' | 'error' | 'success';
  content: string;
  embedding?: number[];
  importance: number;
  tags: string[];
  references: string[];
  isPinned: boolean;
  createdAt: Date;
  accessedAt: Date;
}

export interface AIContext {
  id: string;
  projectId: string;
  name: string;
  description: string;
  context: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextMemory {
  id: string;
  contextId: string;
  content: string;
  embedding?: number[];
  importance: number;
  createdAt: Date;
}

export interface KnowledgeNode {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'concept' | 'function' | 'class' | 'pattern' | 'decision';
  connections: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vector {
  id: string;
  namespace: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  ttl?: Date;
  createdAt: Date;
}

export interface Settings {
  id: string;
  category: 'general' | 'security' | 'ai' | 'git' | 'ui' | 'vault' | 'deployment' | 'tasks' | 'local_models' | 'search' | 'citations';
  key: string;
  value: any;
  encrypted: boolean;
  updatedAt: Date;
}

export interface Commit {
  id: string;
  projectId: string;
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
  parentHashes: string[];
}

export interface Performance {
  id: string;
  category: 'load' | 'ai' | 'git' | 'ui' | 'memory' | 'battery' | 'network';
  metric: string;
  value: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ErrorLog {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  stack?: string;
  metadata: Record<string, any>;
  resolved: boolean;
  timestamp: Date;
}

// Database Class
export class AIWorkspaceDB extends Dexie {
  accounts!: Table<Account>;
  projects!: Table<Project>;
  files!: Table<FileEntry>;
  chats!: Table<ChatMessage>;
  memories!: Table<Memory>;
  vectors!: Table<Vector>;
  settings!: Table<Settings>;
  commits!: Table<Commit>;
  performance!: Table<Performance>;
  errors!: Table<ErrorLog>;
  todos!: Table<Todo>;
  terminals!: Table<Terminal>;
  aiContexts!: Table<AIContext>;
  contextMemories!: Table<ContextMemory>;
  knowledgeNodes!: Table<KnowledgeNode>;

  constructor() {
    super('AIWorkspaceDB');
    
    this.version(1).stores({
      accounts: '++id, providerId, email, isActive, priority, createdAt',
      projects: '++id, name, type, status, createdAt, updatedAt',
      files: '++id, projectId, path, type, isDirty, isStaged, lastModified',
      chats: '++id, projectId, threadId, role, timestamp',
      memories: '++id, projectId, type, importance, isPinned, createdAt, accessedAt',
      vectors: '++id, namespace, createdAt, ttl',
      settings: '++id, category, key, updatedAt',
      commits: '++id, projectId, hash, timestamp',
      performance: '++id, category, metric, timestamp',
      errors: '++id, type, category, resolved, timestamp'
    });

    // Migration hooks
    this.version(2).stores({
      accounts: '++id, providerId, email, isActive, priority, weight, createdAt',
    }).upgrade(async (trans) => {
      const accountsTable = trans.table('accounts');
      await accountsTable.toCollection().modify(account => {
        if (!account.weight) account.weight = 1;
        if (!account.health) {
          account.health = {
            status: 'healthy',
            lastCheck: new Date(),
            errorCount: 0,
            circuitBreakerOpen: false
          };
        }
      });
    });

    this.version(3).stores({
      todos: '++id, projectId, status, priority, assignedAgentId, createdAt, updatedAt',
      terminals: '++id, projectId, isActive, createdAt'
    });

    this.version(4).stores({
      aiContexts: '++id, projectId, isActive, priority, createdAt, updatedAt',
      contextMemories: '++id, contextId, importance, createdAt',
      knowledgeNodes: '++id, projectId, type, createdAt, updatedAt'
    });
  }
}

// Encryption utilities
export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initializeEncryption(passphrase: string): Promise<void> {
    // Derive key using PBKDF2
    const salt = this.getOrCreateSalt();
    this.encryptionKey = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 100000
    }).toString();
  }

  encrypt(data: string): string {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey);
    return encrypted.toString();
  }

  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  private getOrCreateSalt(): string {
    let salt = localStorage.getItem('aiworkspace_salt');
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(256/8).toString();
      localStorage.setItem('aiworkspace_salt', salt);
    }
    return salt;
  }

  lockVault(): void {
    this.encryptionKey = null;
  }

  isUnlocked(): boolean {
    return this.encryptionKey !== null;
  }
}

// Singleton database instance
export const db = new AIWorkspaceDB();
export const encryptionService = EncryptionService.getInstance();