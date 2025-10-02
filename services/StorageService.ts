import { db } from '../src/database/schema';
import type { 
  Project, 
  FileEntry, 
  ChatMessage, 
  Account,
  Memory,
  Vector,
  Settings,
  Commit,
  Performance,
  ErrorLog,
  Todo,
  Terminal
} from '../src/database/schema';

export class StorageService {
  static async initialize() {
    // Database is auto-initialized by Dexie
  }

  // ==================== PROJECTS ====================
  static async getProject(id: string): Promise<Project | undefined> {
    return await db.projects.get(id);
  }

  static async getAllProjects(): Promise<Project[]> {
    return await db.projects.toArray();
  }

  static async addProject(project: Omit<Project, 'id'>): Promise<string> {
    return await db.projects.add(project as Project);
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await db.projects.update(id, updates);
  }

  static async deleteProject(id: string): Promise<void> {
    await db.projects.delete(id);
    // Clean up related data
    await db.files.where('projectId').equals(id).delete();
    await db.chats.where('projectId').equals(id).delete();
    await db.todos.where('projectId').equals(id).delete();
    await db.terminals.where('projectId').equals(id).delete();
    await db.commits.where('projectId').equals(id).delete();
    await db.memories.where('projectId').equals(id).delete();
  }

  // ==================== FILES ====================
  static async getFile(id: string): Promise<FileEntry | undefined> {
    return await db.files.get(id);
  }

  static async getProjectFiles(projectId: string): Promise<FileEntry[]> {
    return await db.files.where('projectId').equals(projectId).toArray();
  }

  static async addFile(file: Omit<FileEntry, 'id'>): Promise<string> {
    return await db.files.add(file as FileEntry);
  }

  static async updateFile(id: string, updates: Partial<FileEntry>): Promise<void> {
    await db.files.update(id, updates);
  }

  static async deleteFile(id: string): Promise<void> {
    await db.files.delete(id);
  }

  // ==================== CHAT MESSAGES ====================
  static async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return await db.chats.get(id);
  }

  static async getAllChatMessages(): Promise<ChatMessage[]> {
    return await db.chats.toArray();
  }

  static async getProjectChatMessages(projectId: string): Promise<ChatMessage[]> {
    return await db.chats.where('projectId').equals(projectId).sortBy('timestamp');
  }

  static async addChatMessage(message: ChatMessage): Promise<string> {
    return await db.chats.add(message);
  }

  static async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<void> {
    await db.chats.update(id, updates);
  }

  static async deleteChatMessage(id: string): Promise<void> {
    await db.chats.delete(id);
  }

  // ==================== ACCOUNTS ====================
  static async getAccount(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  }

  static async getAllAccounts(): Promise<Account[]> {
    return await db.accounts.toArray();
  }

  static async getActiveAccounts(providerId?: string): Promise<Account[]> {
    if (providerId) {
      return await db.accounts
        .where('providerId').equals(providerId)
        .and(acc => acc.isActive)
        .toArray();
    }
    return await db.accounts.where('isActive').equals(1).toArray();
  }

  static async addAccount(account: Account): Promise<string> {
    return await db.accounts.add(account);
  }

  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    await db.accounts.update(id, updates);
  }

  static async deleteAccount(id: string): Promise<void> {
    await db.accounts.delete(id);
  }

  // ==================== TODOS ====================
  static async getTodo(id: string): Promise<Todo | undefined> {
    return await db.todos.get(id);
  }

  static async getProjectTodos(projectId: string): Promise<Todo[]> {
    return await db.todos.where('projectId').equals(projectId).sortBy('createdAt');
  }

  static async addTodo(todo: Todo): Promise<string> {
    return await db.todos.add(todo);
  }

  static async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    await db.todos.update(id, updates);
  }

  static async deleteTodo(id: string): Promise<void> {
    await db.todos.delete(id);
  }

  // ==================== TERMINALS ====================
  static async getTerminal(id: string): Promise<Terminal | undefined> {
    return await db.terminals.get(id);
  }

  static async getProjectTerminals(projectId: string): Promise<Terminal[]> {
    return await db.terminals.where('projectId').equals(projectId).toArray();
  }

  static async addTerminal(terminal: Terminal): Promise<string> {
    return await db.terminals.add(terminal);
  }

  static async updateTerminal(id: string, updates: Partial<Terminal>): Promise<void> {
    await db.terminals.update(id, updates);
  }

  static async deleteTerminal(id: string): Promise<void> {
    await db.terminals.delete(id);
  }

  // ==================== MEMORIES ====================
  static async getMemory(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  }

  static async getProjectMemories(projectId: string): Promise<Memory[]> {
    return await db.memories.where('projectId').equals(projectId).toArray();
  }

  static async addMemory(memory: Memory): Promise<string> {
    return await db.memories.add(memory);
  }

  static async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    await db.memories.update(id, updates);
  }

  static async deleteMemory(id: string): Promise<void> {
    await db.memories.delete(id);
  }

  // ==================== VECTORS ====================
  static async getVector(id: string): Promise<Vector | undefined> {
    return await db.vectors.get(id);
  }

  static async getVectorsByNamespace(namespace: string): Promise<Vector[]> {
    return await db.vectors.where('namespace').equals(namespace).toArray();
  }

  static async addVector(vector: Vector): Promise<string> {
    return await db.vectors.add(vector);
  }

  static async deleteVector(id: string): Promise<void> {
    await db.vectors.delete(id);
  }

  // ==================== SETTINGS ====================
  static async getSetting(id: string): Promise<Settings | undefined> {
    return await db.settings.get(id);
  }

  static async getAllSettings(): Promise<Settings[]> {
    return await db.settings.toArray();
  }

  static async getSettingsByCategory(category: Settings['category']): Promise<Settings[]> {
    return await db.settings.where('category').equals(category).toArray();
  }

  static async addSetting(setting: Settings): Promise<string> {
    return await db.settings.add(setting);
  }

  static async updateSetting(id: string, updates: Partial<Settings>): Promise<void> {
    await db.settings.update(id, updates);
  }

  static async deleteSetting(id: string): Promise<void> {
    await db.settings.delete(id);
  }

  // ==================== COMMITS ====================
  static async getCommit(id: string): Promise<Commit | undefined> {
    return await db.commits.get(id);
  }

  static async getProjectCommits(projectId: string): Promise<Commit[]> {
    return await db.commits.where('projectId').equals(projectId).sortBy('timestamp');
  }

  static async addCommit(commit: Commit): Promise<string> {
    return await db.commits.add(commit);
  }

  // ==================== PERFORMANCE ====================
  static async getPerformanceMetrics(category?: Performance['category']): Promise<Performance[]> {
    if (category) {
      return await db.performance.where('category').equals(category).toArray();
    }
    return await db.performance.toArray();
  }

  static async addPerformanceMetric(metric: Performance): Promise<string> {
    return await db.performance.add(metric);
  }

  // ==================== ERRORS ====================
  static async getError(id: string): Promise<ErrorLog | undefined> {
    return await db.errors.get(id);
  }

  static async getAllErrors(): Promise<ErrorLog[]> {
    return await db.errors.orderBy('timestamp').reverse().toArray();
  }

  static async getUnresolvedErrors(): Promise<ErrorLog[]> {
    return await db.errors.where('resolved').equals(0).toArray();
  }

  static async addError(error: ErrorLog): Promise<string> {
    return await db.errors.add(error);
  }

  static async resolveError(id: string): Promise<void> {
    await db.errors.update(id, { resolved: true });
  }

  // ==================== UTILITY METHODS ====================
  static async clearAllData(): Promise<void> {
    await db.delete();
    await db.open();
  }

  static async exportData(): Promise<string> {
    const data = {
      projects: await db.projects.toArray(),
      files: await db.files.toArray(),
      chats: await db.chats.toArray(),
      accounts: await db.accounts.toArray(),
      todos: await db.todos.toArray(),
      terminals: await db.terminals.toArray(),
      memories: await db.memories.toArray(),
      settings: await db.settings.toArray(),
      commits: await db.commits.toArray()
    };
    return JSON.stringify(data, null, 2);
  }

  static async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    if (data.projects) await db.projects.bulkAdd(data.projects);
    if (data.files) await db.files.bulkAdd(data.files);
    if (data.chats) await db.chats.bulkAdd(data.chats);
    if (data.accounts) await db.accounts.bulkAdd(data.accounts);
    if (data.todos) await db.todos.bulkAdd(data.todos);
    if (data.terminals) await db.terminals.bulkAdd(data.terminals);
    if (data.memories) await db.memories.bulkAdd(data.memories);
    if (data.settings) await db.settings.bulkAdd(data.settings);
    if (data.commits) await db.commits.bulkAdd(data.commits);
  }

  // Legacy compatibility methods
  static async getAllAIProviders(): Promise<any[]> {
    const accounts = await db.accounts.toArray();
    const providers = new Map<string, any>();
    
    accounts.forEach(account => {
      if (!providers.has(account.providerId)) {
        providers.set(account.providerId, {
          id: account.providerId,
          name: account.providerId,
          type: account.providerId,
          status: account.health.status === 'healthy' ? 'connected' : 'error',
          accounts: []
        });
      }
      providers.get(account.providerId)!.accounts.push(account);
    });
    
    return Array.from(providers.values());
  }

  static async getAllAgents(): Promise<any[]> {
    // Return default agents from agentOrchestra
    return [];
  }

  static async getAllTasks(): Promise<any[]> {
    // Tasks are stored in settings with category 'tasks'
    const taskSettings = await db.settings.where('category').equals('tasks').toArray();
    return taskSettings.map(s => s.value);
  }

  static async addTask(task: any): Promise<string> {
    return await db.settings.add({
      id: `task_${task.id}`,
      category: 'tasks',
      key: task.id,
      value: task,
      encrypted: false,
      updatedAt: new Date()
    });
  }

  static async updateTask(id: string, updates: any): Promise<void> {
    await db.settings.update(`task_${id}`, {
      value: updates,
      updatedAt: new Date()
    });
  }

  static async deleteTask(id: string): Promise<void> {
    await db.settings.delete(`task_${id}`);
  }
}
