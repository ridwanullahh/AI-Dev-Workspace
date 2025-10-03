import { db } from '../database/schema';
import type {
  Account,
  Project,
  FileEntry,
  ChatMessage,
  Memory,
  Vector,
  Settings,
  Commit,
  Performance,
  ErrorLog,
  Todo,
  Terminal,
  AIContext,
  ContextMemory,
  KnowledgeNode
} from '../database/schema';

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Account Management
  async getAccounts(): Promise<Account[]> {
    return await db.accounts.toArray();
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  }

  async addAccount(account: Account): Promise<string> {
    return await db.accounts.add(account);
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    await db.accounts.update(id, updates);
  }

  async deleteAccount(id: string): Promise<void> {
    await db.accounts.delete(id);
  }

  // Project Management
  async getProjects(): Promise<Project[]> {
    return await db.projects.toArray();
  }

  async getProject(id: string): Promise<Project | undefined> {
    return await db.projects.get(id);
  }

  async addProject(project: Project): Promise<string> {
    return await db.projects.add(project);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await db.projects.update(id, updates);
  }

  async deleteProject(id: string): Promise<void> {
    await db.projects.delete(id);
  }

  // File Management
  async getFiles(projectId: string): Promise<FileEntry[]> {
    return await db.files.where('projectId').equals(projectId).toArray();
  }

  async getFile(id: string): Promise<FileEntry | undefined> {
    return await db.files.get(id);
  }

  async addFile(file: FileEntry): Promise<string> {
    return await db.files.add(file);
  }

  async updateFile(id: string, updates: Partial<FileEntry>): Promise<void> {
    await db.files.update(id, updates);
  }

  async deleteFile(id: string): Promise<void> {
    await db.files.delete(id);
  }

  // Chat Management
  async getChats(projectId?: string): Promise<ChatMessage[]> {
    if (projectId) {
      return await db.chats.where('projectId').equals(projectId).toArray();
    }
    return await db.chats.toArray();
  }

  async getChat(id: string): Promise<ChatMessage | undefined> {
    return await db.chats.get(id);
  }

  async addChat(chat: ChatMessage): Promise<string> {
    return await db.chats.add(chat);
  }

  async updateChat(id: string, updates: Partial<ChatMessage>): Promise<void> {
    await db.chats.update(id, updates);
  }

  async deleteChat(id: string): Promise<void> {
    await db.chats.delete(id);
  }

  // Memory Management
  async getMemories(projectId: string): Promise<Memory[]> {
    return await db.memories.where('projectId').equals(projectId).toArray();
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  }

  async addMemory(memory: Memory): Promise<string> {
    return await db.memories.add(memory);
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    await db.memories.update(id, updates);
  }

  async deleteMemory(id: string): Promise<void> {
    await db.memories.delete(id);
  }

  // AI Context Management
  async getAIContext(id: string): Promise<AIContext | undefined> {
    return await db.aiContexts.get(id);
  }

  async getAIContexts(projectId: string): Promise<AIContext[]> {
    return await db.aiContexts.where('projectId').equals(projectId).toArray();
  }

  async addAIContext(context: AIContext): Promise<string> {
    return await db.aiContexts.add(context);
  }

  async updateAIContext(id: string, updates: Partial<AIContext>): Promise<void> {
    await db.aiContexts.update(id, updates);
  }

  async deleteAIContext(id: string): Promise<void> {
    await db.aiContexts.delete(id);
  }

  // Context Memory Management
  async getContextMemory(id: string): Promise<ContextMemory | undefined> {
    return await db.contextMemories.get(id);
  }

  async getContextMemories(contextId: string): Promise<ContextMemory[]> {
    return await db.contextMemories.where('contextId').equals(contextId).toArray();
  }

  async addContextMemory(memory: ContextMemory): Promise<string> {
    return await db.contextMemories.add(memory);
  }

  async updateContextMemory(id: string, updates: Partial<ContextMemory>): Promise<void> {
    await db.contextMemories.update(id, updates);
  }

  async deleteContextMemory(id: string): Promise<void> {
    await db.contextMemories.delete(id);
  }

  // Knowledge Node Management
  async getKnowledgeNode(id: string): Promise<KnowledgeNode | undefined> {
    return await db.knowledgeNodes.get(id);
  }

  async getKnowledgeNodes(projectId: string): Promise<KnowledgeNode[]> {
    return await db.knowledgeNodes.where('projectId').equals(projectId).toArray();
  }

  async addKnowledgeNode(node: KnowledgeNode): Promise<string> {
    return await db.knowledgeNodes.add(node);
  }

  async updateKnowledgeNode(id: string, updates: Partial<KnowledgeNode>): Promise<void> {
    await db.knowledgeNodes.update(id, updates);
  }

  async deleteKnowledgeNode(id: string): Promise<void> {
    await db.knowledgeNodes.delete(id);
  }

  // Vector Management
  async getVectors(namespace: string): Promise<Vector[]> {
    return await db.vectors.where('namespace').equals(namespace).toArray();
  }

  async getVector(id: string): Promise<Vector | undefined> {
    return await db.vectors.get(id);
  }

  async addVector(vector: Vector): Promise<string> {
    return await db.vectors.add(vector);
  }

  async updateVector(id: string, updates: Partial<Vector>): Promise<void> {
    await db.vectors.update(id, updates);
  }

  async deleteVector(id: string): Promise<void> {
    await db.vectors.delete(id);
  }

  // Settings Management
  async getSettings(category?: string): Promise<Settings[]> {
    if (category) {
      return await db.settings.where('category').equals(category).toArray();
    }
    return await db.settings.toArray();
  }

  async getSetting(id: string): Promise<Settings | undefined> {
    return await db.settings.get(id);
  }

  async addSetting(setting: Settings): Promise<string> {
    return await db.settings.add(setting);
  }

  async updateSetting(id: string, updates: Partial<Settings>): Promise<void> {
    await db.settings.update(id, updates);
  }

  async deleteSetting(id: string): Promise<void> {
    await db.settings.delete(id);
  }

  // Commit Management
  async getCommits(projectId: string): Promise<Commit[]> {
    return await db.commits.where('projectId').equals(projectId).toArray();
  }

  async getCommit(id: string): Promise<Commit | undefined> {
    return await db.commits.get(id);
  }

  async addCommit(commit: Commit): Promise<string> {
    return await db.commits.add(commit);
  }

  async updateCommit(id: string, updates: Partial<Commit>): Promise<void> {
    await db.commits.update(id, updates);
  }

  async deleteCommit(id: string): Promise<void> {
    await db.commits.delete(id);
  }

  // Performance Management
  async getPerformanceMetrics(category?: string): Promise<Performance[]> {
    if (category) {
      return await db.performance.where('category').equals(category).toArray();
    }
    return await db.performance.toArray();
  }

  async addPerformanceMetric(metric: Performance): Promise<string> {
    return await db.performance.add(metric);
  }

  // Error Log Management
  async getErrorLogs(category?: string): Promise<ErrorLog[]> {
    if (category) {
      return await db.errors.where('category').equals(category).toArray();
    }
    return await db.errors.toArray();
  }

  async addErrorLog(log: ErrorLog): Promise<string> {
    return await db.errors.add(log);
  }

  async markErrorResolved(id: string): Promise<void> {
    await db.errors.update(id, { resolved: true });
  }

  // Todo Management
  async getTodos(projectId: string): Promise<Todo[]> {
    return await db.todos.where('projectId').equals(projectId).toArray();
  }

  async getTodo(id: string): Promise<Todo | undefined> {
    return await db.todos.get(id);
  }

  async addTodo(todo: Todo): Promise<string> {
    return await db.todos.add(todo);
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    await db.todos.update(id, updates);
  }

  async deleteTodo(id: string): Promise<void> {
    await db.todos.delete(id);
  }

  // Terminal Management
  async getTerminals(projectId: string): Promise<Terminal[]> {
    return await db.terminals.where('projectId').equals(projectId).toArray();
  }

  async getTerminal(id: string): Promise<Terminal | undefined> {
    return await db.terminals.get(id);
  }

  async addTerminal(terminal: Terminal): Promise<string> {
    return await db.terminals.add(terminal);
  }

  async updateTerminal(id: string, updates: Partial<Terminal>): Promise<void> {
    await db.terminals.update(id, updates);
  }

  async deleteTerminal(id: string): Promise<void> {
    await db.terminals.delete(id);
  }

  // Bulk Operations
  async clearProjectData(projectId: string): Promise<void> {
    await Promise.all([
      db.files.where('projectId').equals(projectId).delete(),
      db.chats.where('projectId').equals(projectId).delete(),
      db.memories.where('projectId').equals(projectId).delete(),
      db.commits.where('projectId').equals(projectId).delete(),
      db.todos.where('projectId').equals(projectId).delete(),
      db.terminals.where('projectId').equals(projectId).delete(),
      db.aiContexts.where('projectId').equals(projectId).delete(),
      db.knowledgeNodes.where('projectId').equals(projectId).delete(),
    ]);
  }

  async exportData(): Promise<string> {
    const data = {
      accounts: await db.accounts.toArray(),
      projects: await db.projects.toArray(),
      files: await db.files.toArray(),
      chats: await db.chats.toArray(),
      memories: await db.memories.toArray(),
      settings: await db.settings.toArray(),
      commits: await db.commits.toArray(),
      todos: await db.todos.toArray(),
      terminals: await db.terminals.toArray(),
      aiContexts: await db.aiContexts.toArray(),
      contextMemories: await db.contextMemories.toArray(),
      knowledgeNodes: await db.knowledgeNodes.toArray(),
    };
    return JSON.stringify(data);
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    if (data.accounts) await db.accounts.bulkAdd(data.accounts);
    if (data.projects) await db.projects.bulkAdd(data.projects);
    if (data.files) await db.files.bulkAdd(data.files);
    if (data.chats) await db.chats.bulkAdd(data.chats);
    if (data.memories) await db.memories.bulkAdd(data.memories);
    if (data.settings) await db.settings.bulkAdd(data.settings);
    if (data.commits) await db.commits.bulkAdd(data.commits);
    if (data.todos) await db.todos.bulkAdd(data.todos);
    if (data.terminals) await db.terminals.bulkAdd(data.terminals);
    if (data.aiContexts) await db.aiContexts.bulkAdd(data.aiContexts);
    if (data.contextMemories) await db.contextMemories.bulkAdd(data.contextMemories);
    if (data.knowledgeNodes) await db.knowledgeNodes.bulkAdd(data.knowledgeNodes);
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      db.accounts.clear(),
      db.projects.clear(),
      db.files.clear(),
      db.chats.clear(),
      db.memories.clear(),
      db.vectors.clear(),
      db.settings.clear(),
      db.commits.clear(),
      db.performance.clear(),
      db.errors.clear(),
      db.todos.clear(),
      db.terminals.clear(),
      db.aiContexts.clear(),
      db.contextMemories.clear(),
      db.knowledgeNodes.clear(),
    ]);
  }
}

export const storageService = StorageService.getInstance();
