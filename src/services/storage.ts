import { db, type ProjectDB, type AIAccountDB, type AIProviderDB, type AgentDB, type ChatMessageDB, type TaskDB } from '../database/database'
import type { Project, AIAccount, AIProvider, Agent, ChatMessage, Task } from '../types'

// Storage service for managing IndexedDB operations
export class StorageService {
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await db.open()
      this.isInitialized = true
      console.log('✅ Storage service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize storage service:', error)
      throw error
    }
  }

  // Project operations
  async saveProject(project: Project): Promise<void> {
    try {
      const projectDB: ProjectDB = {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        files: project.files.map(file => ({
          ...file,
          lastModified: new Date(file.lastModified)
        })),
        aiContext: {
          ...project.aiContext,
          conversationHistory: project.aiContext.conversationHistory.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          knowledgeGraph: project.aiContext.knowledgeGraph.map(node => ({
            ...node,
            timestamp: new Date() // Add timestamp if missing
          })),
          activeMemory: project.aiContext.activeMemory.map(memory => ({
            ...memory,
            timestamp: new Date(memory.timestamp)
          }))
        },
        agents: project.agents.map(assignment => ({
          ...assignment,
          id: assignment.id || `${project.id}_${assignment.agentId}`
        }))
      }

      await db.projects.put(projectDB)
      console.log(`✅ Project saved: ${project.name}`)
    } catch (error) {
      console.error('❌ Failed to save project:', error)
      throw error
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const projectDB = await db.projects.get(id)
      if (!projectDB) return null

      return {
        ...projectDB,
        createdAt: projectDB.createdAt.toISOString(),
        updatedAt: projectDB.updatedAt.toISOString(),
        files: projectDB.files.map(file => ({
          ...file,
          lastModified: file.lastModified.toISOString()
        })),
        aiContext: {
          ...projectDB.aiContext,
          conversationHistory: projectDB.aiContext.conversationHistory.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
          activeMemory: projectDB.aiContext.activeMemory.map(memory => ({
            ...memory,
            timestamp: memory.timestamp.toISOString()
          }))
        }
      }
    } catch (error) {
      console.error('❌ Failed to get project:', error)
      throw error
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const projectsDB = await db.projects.toArray()
      return projectsDB.map(projectDB => ({
        ...projectDB,
        createdAt: projectDB.createdAt.toISOString(),
        updatedAt: projectDB.updatedAt.toISOString(),
        files: projectDB.files.map(file => ({
          ...file,
          lastModified: file.lastModified.toISOString()
        })),
        aiContext: {
          ...projectDB.aiContext,
          conversationHistory: projectDB.aiContext.conversationHistory.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
          activeMemory: projectDB.aiContext.activeMemory.map(memory => ({
            ...memory,
            timestamp: memory.timestamp.toISOString()
          }))
        }
      }))
    } catch (error) {
      console.error('❌ Failed to get all projects:', error)
      throw error
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await db.projects.delete(id)
      // Delete related data
      await db.projectFiles.where('projectId').equals(id).delete()
      await db.chatMessages.where('projectId').equals(id).delete()
      await db.tasks.where('projectId').equals(id).delete()
      console.log(`✅ Project deleted: ${id}`)
    } catch (error) {
      console.error('❌ Failed to delete project:', error)
      throw error
    }
  }

  // AI Provider operations
  async saveAIProvider(provider: AIProvider): Promise<void> {
    try {
      const providerDB: AIProviderDB = {
        ...provider,
        accounts: provider.accounts.map(account => ({
          ...account,
          rateLimit: {
            ...account.rateLimit,
            resetTime: new Date(account.rateLimit.resetTime)
          },
          usage: {
            ...account.usage,
            lastUsed: new Date(account.usage.lastUsed)
          }
        }))
      }

      await db.aiProviders.put(providerDB)
      console.log(`✅ AI Provider saved: ${provider.name}`)
    } catch (error) {
      console.error('❌ Failed to save AI provider:', error)
      throw error
    }
  }

  async getAIProvider(id: string): Promise<AIProvider | null> {
    try {
      const providerDB = await db.aiProviders.get(id)
      if (!providerDB) return null

      return {
        ...providerDB,
        accounts: providerDB.accounts.map(account => ({
          ...account,
          rateLimit: {
            ...account.rateLimit,
            resetTime: account.rateLimit.resetTime.toISOString()
          },
          usage: {
            ...account.usage,
            lastUsed: account.usage.lastUsed.toISOString()
          }
        }))
      }
    } catch (error) {
      console.error('❌ Failed to get AI provider:', error)
      throw error
    }
  }

  async getAllAIProviders(): Promise<AIProvider[]> {
    try {
      const providersDB = await db.aiProviders.toArray()
      return providersDB.map(providerDB => ({
        ...providerDB,
        accounts: providerDB.accounts.map(account => ({
          ...account,
          rateLimit: {
            ...account.rateLimit,
            resetTime: account.rateLimit.resetTime.toISOString()
          },
          usage: {
            ...account.usage,
            lastUsed: account.usage.lastUsed.toISOString()
          }
        }))
      }))
    } catch (error) {
      console.error('❌ Failed to get all AI providers:', error)
      throw error
    }
  }

  async addAIAccount(providerId: string, account: AIAccount): Promise<string> {
    try {
      const accountId = account.id || `${providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const accountDB: AIAccountDB = {
        ...account,
        id: accountId,
        rateLimit: {
          ...account.rateLimit,
          resetTime: new Date(account.rateLimit.resetTime)
        },
        usage: {
          ...account.usage,
          lastUsed: new Date(account.usage.lastUsed)
        }
      }

      await db.aiAccounts.add(accountDB)
      console.log(`✅ AI Account added: ${account.name}`)
      return accountId
    } catch (error) {
      console.error('❌ Failed to add AI account:', error)
      throw error
    }
  }

  // Agent operations
  async saveAgent(agent: Agent): Promise<void> {
    try {
      const agentDB: AgentDB = {
        ...agent,
        performance: agent.performance,
        config: agent.config
      }

      await db.agents.put(agentDB)
      console.log(`✅ Agent saved: ${agent.name}`)
    } catch (error) {
      console.error('❌ Failed to save agent:', error)
      throw error
    }
  }

  async getAgent(id: string): Promise<Agent | null> {
    try {
      const agentDB = await db.agents.get(id)
      return agentDB || null
    } catch (error) {
      console.error('❌ Failed to get agent:', error)
      throw error
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    try {
      return await db.agents.toArray()
    } catch (error) {
      console.error('❌ Failed to get all agents:', error)
      throw error
    }
  }

  // Chat operations
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      const messageDB: ChatMessageDB = {
        ...message,
        timestamp: new Date(message.timestamp)
      }

      await db.chatMessages.add(messageDB)
      console.log(`✅ Message saved: ${message.id}`)
    } catch (error) {
      console.error('❌ Failed to save message:', error)
      throw error
    }
  }

  async getMessages(projectId?: string): Promise<ChatMessage[]> {
    try {
      let messagesDB: ChatMessageDB[]
      
      if (projectId) {
        messagesDB = await db.chatMessages
          .where('projectId')
          .equals(projectId)
          .sortBy('timestamp')
      } else {
        messagesDB = await db.chatMessages.orderBy('timestamp').toArray()
      }

      return messagesDB.map(messageDB => ({
        ...messageDB,
        timestamp: messageDB.timestamp.toISOString()
      }))
    } catch (error) {
      console.error('❌ Failed to get messages:', error)
      throw error
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      await db.chatMessages.delete(id)
      console.log(`✅ Message deleted: ${id}`)
    } catch (error) {
      console.error('❌ Failed to delete message:', error)
      throw error
    }
  }

  // Task operations
  async saveTask(task: Task): Promise<void> {
    try {
      const taskDB: TaskDB = {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt)
      }

      await db.tasks.put(taskDB)
      console.log(`✅ Task saved: ${task.title}`)
    } catch (error) {
      console.error('❌ Failed to save task:', error)
      throw error
    }
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      const taskDB = await db.tasks.get(id)
      if (!taskDB) return null

      return {
        ...taskDB,
        createdAt: taskDB.createdAt.toISOString(),
        updatedAt: taskDB.updatedAt.toISOString()
      }
    } catch (error) {
      console.error('❌ Failed to get task:', error)
      throw error
    }
  }

  async getTasks(projectId?: string): Promise<Task[]> {
    try {
      let tasksDB: TaskDB[]
      
      if (projectId) {
        tasksDB = await db.tasks
          .where('projectId')
          .equals(projectId)
          .sortBy('createdAt')
      } else {
        tasksDB = await db.tasks.orderBy('createdAt').toArray()
      }

      return tasksDB.map(taskDB => ({
        ...taskDB,
        createdAt: taskDB.createdAt.toISOString(),
        updatedAt: taskDB.updatedAt.toISOString()
      }))
    } catch (error) {
      console.error('❌ Failed to get tasks:', error)
      throw error
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      await db.tasks.delete(id)
      console.log(`✅ Task deleted: ${id}`)
    } catch (error) {
      console.error('❌ Failed to delete task:', error)
      throw error
    }
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    try {
      await db.delete()
      await db.open()
      console.log('✅ All data cleared')
    } catch (error) {
      console.error('❌ Failed to clear all data:', error)
      throw error
    }
  }

  async getStorageStats(): Promise<{
    projects: number
    messages: number
    tasks: number
    agents: number
    providers: number
    estimatedSize: string
  }> {
    try {
      const [projects, messages, tasks, agents, providers] = await Promise.all([
        db.projects.count(),
        db.chatMessages.count(),
        db.tasks.count(),
        db.agents.count(),
        db.aiProviders.count()
      ])

      // Rough size estimation
      const estimatedBytes = 
        projects * 5000 +    // ~5KB per project
        messages * 1000 +    // ~1KB per message
        tasks * 2000 +       // ~2KB per task
        agents * 3000 +      // ~3KB per agent
        providers * 2000     // ~2KB per provider

      const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
      }

      return {
        projects,
        messages,
        tasks,
        agents,
        providers,
        estimatedSize: formatSize(estimatedBytes)
      }
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export const storageService = new StorageService()