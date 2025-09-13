import { Project, ChatMessage, AIProvider, Agent, Task, ProjectFile, AIContext } from './types';

class StorageService {
  private dbName = 'ai-workspace';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('status', 'status');
          projectStore.createIndex('type', 'type');
          projectStore.createIndex('updatedAt', 'updatedAt');
        }

        // Chat messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('projectId', 'projectId');
          messageStore.createIndex('timestamp', 'timestamp');
          messageStore.createIndex('agentId', 'agentId');
        }

        // AI Providers store
        if (!db.objectStoreNames.contains('providers')) {
          const providerStore = db.createObjectStore('providers', { keyPath: 'id' });
          providerStore.createIndex('status', 'status');
          providerStore.createIndex('type', 'type');
        }

        // Agents store
        if (!db.objectStoreNames.contains('agents')) {
          const agentStore = db.createObjectStore('agents', { keyPath: 'id' });
          agentStore.createIndex('isActive', 'isActive');
          agentStore.createIndex('role', 'role');
        }

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('projectId', 'projectId');
          taskStore.createIndex('status', 'status');
          taskStore.createIndex('assignedAgent', 'assignedAgent');
          taskStore.createIndex('priority', 'priority');
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId');
          fileStore.createIndex('path', 'path');
          fileStore.createIndex('language', 'language');
        }

        // Embeddings store
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', { keyPath: 'id' });
          embeddingStore.createIndex('type', 'type');
          embeddingStore.createIndex('projectId', 'projectId');
        }

        // Context store
        if (!db.objectStoreNames.contains('context')) {
          const contextStore = db.createObjectStore('context', { keyPath: 'id' });
          contextStore.createIndex('projectId', 'projectId');
          contextStore.createIndex('type', 'type');
          contextStore.createIndex('relevanceScore', 'relevanceScore');
        }
      };
    });
  }

  // Generic CRUD operations
  private async performTransaction<T>(
    storeName: string,
    operation: 'add' | 'put' | 'get' | 'delete' | 'getAll',
    data?: T,
    key?: string
  ): Promise<T | T[] | void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      let request: IDBRequest;

      switch (operation) {
        case 'add':
        case 'put':
          request = store[operation](data);
          break;
        case 'get':
          request = store.get(key!);
          break;
        case 'delete':
          request = store.delete(key!);
          break;
        case 'getAll':
          request = store.getAll();
          break;
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Project operations
  async saveProject(project: Project): Promise<void> {
    await this.performTransaction('projects', 'put', project);
  }

  async getProject(id: string): Promise<Project | undefined> {
    return await this.performTransaction('projects', 'get', undefined, id) as Project;
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.performTransaction('projects', 'getAll') as Project[];
  }

  async deleteProject(id: string): Promise<void> {
    await this.performTransaction('projects', 'delete', undefined, id);
    // Also delete related data
    await this.deleteProjectFiles(id);
    await this.deleteProjectMessages(id);
    await this.deleteProjectTasks(id);
  }

  // Chat message operations
  async saveMessage(message: ChatMessage): Promise<void> {
    await this.performTransaction('messages', 'put', message);
  }

  async getMessages(projectId?: string): Promise<ChatMessage[]> {
    if (projectId) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
          const messages = request.result.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          resolve(messages);
        };
        request.onerror = () => reject(request.error);
      });
    }
    return await this.performTransaction('messages', 'getAll') as ChatMessage[];
  }

  private async deleteProjectMessages(projectId: string): Promise<void> {
    const messages = await this.getMessages(projectId);
    for (const message of messages) {
      await this.performTransaction('messages', 'delete', undefined, message.id);
    }
  }

  // AI Provider operations
  async saveProvider(provider: AIProvider): Promise<void> {
    await this.performTransaction('providers', 'put', provider);
  }

  async getProviders(): Promise<AIProvider[]> {
    return await this.performTransaction('providers', 'getAll') as AIProvider[];
  }

  async getProvider(id: string): Promise<AIProvider | undefined> {
    return await this.performTransaction('providers', 'get', undefined, id) as AIProvider;
  }

  // Agent operations
  async saveAgent(agent: Agent): Promise<void> {
    await this.performTransaction('agents', 'put', agent);
  }

  async getAgents(): Promise<Agent[]> {
    return await this.performTransaction('agents', 'getAll') as Agent[];
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return await this.performTransaction('agents', 'get', undefined, id) as Agent;
  }

  // Task operations
  async saveTask(task: Task): Promise<void> {
    await this.performTransaction('tasks', 'put', task);
  }

  async getTasks(projectId?: string): Promise<Task[]> {
    if (projectId) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return await this.performTransaction('tasks', 'getAll') as Task[];
  }

  private async deleteProjectTasks(projectId: string): Promise<void> {
    const tasks = await this.getTasks(projectId);
    for (const task of tasks) {
      await this.performTransaction('tasks', 'delete', undefined, task.id);
    }
  }

  // File operations
  async saveFile(file: ProjectFile & { projectId: string }): Promise<void> {
    await this.performTransaction('files', 'put', file);
  }

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteProjectFiles(projectId: string): Promise<void> {
    const files = await this.getProjectFiles(projectId);
    for (const file of files) {
      await this.performTransaction('files', 'delete', undefined, file.id);
    }
  }

  // Embedding operations
  async saveEmbedding(id: string, embedding: number[], metadata: any): Promise<void> {
    await this.performTransaction('embeddings', 'put', {
      id,
      embedding,
      metadata,
      timestamp: new Date()
    });
  }

  async getEmbedding(id: string): Promise<{ embedding: number[], metadata: any } | undefined> {
    return await this.performTransaction('embeddings', 'get', undefined, id) as any;
  }

  // Context operations
  async saveContext(projectId: string, context: AIContext): Promise<void> {
    await this.performTransaction('context', 'put', {
      id: `context_${projectId}`,
      projectId,
      ...context,
      timestamp: new Date()
    });
  }

  async getContext(projectId: string): Promise<AIContext | undefined> {
    const result = await this.performTransaction('context', 'get', undefined, `context_${projectId}`) as any;
    if (result) {
      const { id, projectId: _, timestamp, ...context } = result;
      return context;
    }
    return undefined;
  }

  // Utility methods
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const stores = ['projects', 'messages', 'providers', 'agents', 'tasks', 'files', 'embeddings', 'context'];
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getStorageUsage(): Promise<{ used: number, available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    }
    return { used: 0, available: 0 };
  }
}

export const storageService = new StorageService();