import { semanticMemoryArchitecture } from './semanticMemory'
import { knowledgeGraphSystem } from './knowledgeGraph'
import { enhancedVectorDatabase } from './enhancedVectorDatabase'

interface WorkerTask {
  id: string
  type: 'memory_consolidation' | 'graph_pruning' | 'vector_maintenance'
  priority: 'low' | 'medium' | 'high'
  projectId?: string
  data?: any
  createdAt: Date
  completedAt?: Date
  progress: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
}

interface MemoryWorkerConfig {
  maxConcurrentWorkers: number
  memoryConsolidationInterval: number // in minutes
  graphPruningInterval: number // in minutes
  vectorMaintenanceInterval: number // in minutes
  enableBackgroundTasks: boolean
}

class MemoryWorkerService {
  private config: MemoryWorkerConfig = {
    maxConcurrentWorkers: 2,
    memoryConsolidationInterval: 60, // 1 hour
    graphPruningInterval: 120, // 2 hours
    vectorMaintenanceInterval: 30, // 30 minutes
    enableBackgroundTasks: true
  }

  private workers: Map<string, Worker> = new Map()
  private taskQueue: WorkerTask[] = []
  private activeTasks: Set<string> = new Set()
  private intervals: NodeJS.Timeout[] = []
  private isInitialized = false

  async initialize(config?: Partial<MemoryWorkerConfig>): Promise<void> {
    try {
      console.log('Initializing Memory Worker Service...')

      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config }
      }

      // Start background maintenance tasks
      if (this.config.enableBackgroundTasks) {
        this.startBackgroundTasks()
      }

      this.isInitialized = true
      console.log('Memory Worker Service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Memory Worker Service:', error)
      throw error
    }
  }

  private startBackgroundTasks(): void {
    // Memory consolidation task
    const memoryInterval = setInterval(async () => {
      if (this.activeTasks.size < this.config.maxConcurrentWorkers) {
        await this.scheduleTask({
          id: `memory_consolidation_${Date.now()}`,
          type: 'memory_consolidation',
          priority: 'medium',
          createdAt: new Date(),
          progress: 0,
          status: 'pending'
        })
      }
    }, this.config.memoryConsolidationInterval * 60 * 1000)

    // Knowledge graph pruning task
    const graphInterval = setInterval(async () => {
      if (this.activeTasks.size < this.config.maxConcurrentWorkers) {
        await this.scheduleTask({
          id: `graph_pruning_${Date.now()}`,
          type: 'graph_pruning',
          priority: 'low',
          createdAt: new Date(),
          progress: 0,
          status: 'pending'
        })
      }
    }, this.config.graphPruningInterval * 60 * 1000)

    // Vector maintenance task
    const vectorInterval = setInterval(async () => {
      if (this.activeTasks.size < this.config.maxConcurrentWorkers) {
        await this.scheduleTask({
          id: `vector_maintenance_${Date.now()}`,
          type: 'vector_maintenance',
          priority: 'high',
          createdAt: new Date(),
          progress: 0,
          status: 'pending'
        })
      }
    }, this.config.vectorMaintenanceInterval * 60 * 1000)

    this.intervals = [memoryInterval, graphInterval, vectorInterval]
  }

  async scheduleTask(task: WorkerTask): Promise<void> {
    this.taskQueue.push(task)
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    await this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.activeTasks.size >= this.config.maxConcurrentWorkers || this.taskQueue.length === 0) {
      return
    }

    const task = this.taskQueue.shift()
    if (!task) return

    task.status = 'running'
    this.activeTasks.add(task.id)

    try {
      await this.executeTask(task)
      task.status = 'completed'
      task.completedAt = new Date()
      task.progress = 100
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Task ${task.id} failed:`, error)
    } finally {
      this.activeTasks.delete(task.id)
      await this.processQueue() // Process next task
    }
  }

  private async executeTask(task: WorkerTask): Promise<void> {
    switch (task.type) {
      case 'memory_consolidation':
        await this.performMemoryConsolidation(task)
        break
      case 'graph_pruning':
        await this.performGraphPruning(task)
        break
      case 'vector_maintenance':
        await this.performVectorMaintenance(task)
        break
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  private async performMemoryConsolidation(task: WorkerTask): Promise<void> {
    console.log('Performing memory consolidation...')

    task.progress = 10

    // Get memory analytics to determine if consolidation is needed
    const analytics = await semanticMemoryArchitecture.getMemoryAnalytics()

    task.progress = 30

    if (analytics.totalMemories > 1000) {
      await semanticMemoryArchitecture.performMemoryConsolidation()
      task.progress = 80
    }

    // Perform cleanup
    await semanticMemoryArchitecture.performMemoryCleanup()

    task.progress = 100
    console.log('Memory consolidation completed')
  }

  private async performGraphPruning(task: WorkerTask): Promise<void> {
    console.log('Performing knowledge graph pruning...')

    task.progress = 20

    // Perform graph pruning
    await knowledgeGraphSystem.performGraphPruning()

    task.progress = 60

    // Perform clustering update
    await knowledgeGraphSystem.performGraphClustering()

    task.progress = 100
    console.log('Knowledge graph pruning completed')
  }

  private async performVectorMaintenance(task: WorkerTask): Promise<void> {
    console.log('Performing vector database maintenance...')

    task.progress = 25

    // Get memory stats
    const stats = await enhancedVectorDatabase.getMemoryStats()

    task.progress = 50

    // If memory usage is high, perform cleanup
    if (stats.compressionRatio < 0.8) {
      // Note: The enhanced vector database doesn't have explicit cleanup,
      // but we can rebuild indexes if needed
      console.log('Vector database compression needed')
    }

    task.progress = 100
    console.log('Vector database maintenance completed')
  }

  // Method to run tasks on-demand
  async runMemoryConsolidation(projectId?: string): Promise<void> {
    await this.scheduleTask({
      id: `manual_memory_consolidation_${Date.now()}`,
      type: 'memory_consolidation',
      priority: 'high',
      projectId,
      createdAt: new Date(),
      progress: 0,
      status: 'pending'
    })
  }

  async runGraphPruning(): Promise<void> {
    await this.scheduleTask({
      id: `manual_graph_pruning_${Date.now()}`,
      type: 'graph_pruning',
      priority: 'high',
      createdAt: new Date(),
      progress: 0,
      status: 'pending'
    })
  }

  async runVectorMaintenance(): Promise<void> {
    await this.scheduleTask({
      id: `manual_vector_maintenance_${Date.now()}`,
      type: 'vector_maintenance',
      priority: 'high',
      createdAt: new Date(),
      progress: 0,
      status: 'pending'
    })
  }

  // Get current task status
  getTaskStatus(taskId: string): WorkerTask | undefined {
    return this.taskQueue.find(t => t.id === taskId) ||
           Array.from(this.workers.keys()).find(id => id === taskId) ?
           { id: taskId, type: 'unknown' as any, priority: 'low', createdAt: new Date(), progress: 0, status: 'running' } :
           undefined
  }

  getActiveTasks(): WorkerTask[] {
    return Array.from(this.activeTasks).map(id => this.getTaskStatus(id)!).filter(Boolean)
  }

  getQueuedTasks(): WorkerTask[] {
    return [...this.taskQueue]
  }

  // Configuration management
  updateConfig(config: Partial<MemoryWorkerConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart intervals if needed
    if (config.enableBackgroundTasks !== undefined) {
      if (config.enableBackgroundTasks) {
        this.startBackgroundTasks()
      } else {
        this.intervals.forEach(interval => clearInterval(interval))
        this.intervals = []
      }
    }
  }

  getConfig(): MemoryWorkerConfig {
    return { ...this.config }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    console.log('Shutting down Memory Worker Service...')

    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []

    // Wait for active tasks to complete
    while (this.activeTasks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Terminate workers
    for (const worker of this.workers.values()) {
      worker.terminate()
    }
    this.workers.clear()

    console.log('Memory Worker Service shut down')
  }
}

export const memoryWorkerService = new MemoryWorkerService()