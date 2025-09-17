import * as DB from '../src/database/database';

export class StorageService {
  static async initialize() {
    // Initialization logic here
  }
  // ==================== PROJECTS ====================
  static async getProject(id: string): Promise<DB.ProjectDB | undefined> {
    return await DB.db.projects.get(id);
  }

  static async getAllProjects(): Promise<DB.ProjectDB[]> {
    return await DB.db.projects.toArray();
  }

  static async addProject(project: Omit<DB.ProjectDB, 'id'>): Promise<string> {
    return await DB.db.projects.add(project as DB.ProjectDB);
  }

  static async updateProject(id: string, updates: Partial<DB.ProjectDB>): Promise<void> {
    await DB.db.projects.update(id, updates);
  }

  static async deleteProject(id: string): Promise<void> {
    await DB.db.projects.delete(id);
  }

  // ==================== PROJECT FILES ====================
  static async getProjectFile(id: string): Promise<DB.ProjectFileDB | undefined> {
    return await DB.db.projectFiles.get(id);
  }

  static async getAllProjectFiles(): Promise<DB.ProjectFileDB[]> {
    return await DB.db.projectFiles.toArray();
  }

  static async addProjectFile(file: Omit<DB.ProjectFileDB, 'id'>): Promise<string> {
    return await DB.db.projectFiles.add(file as DB.ProjectFileDB);
  }

  static async updateProjectFile(id: string, updates: Partial<DB.ProjectFileDB>): Promise<void> {
    await DB.db.projectFiles.update(id, updates);
  }

  static async deleteProjectFile(id: string): Promise<void> {
    await DB.db.projectFiles.delete(id);
  }

  // ==================== GIT REPOSITORIES ====================
  static async getGitRepository(id: string): Promise<DB.GitRepositoryDB | undefined> {
    return await DB.db.gitRepositories.get(id);
  }

  static async getAllGitRepositories(): Promise<DB.GitRepositoryDB[]> {
    return await DB.db.gitRepositories.toArray();
  }

  static async addGitRepository(repo: Omit<DB.GitRepositoryDB, 'id'>): Promise<string> {
    return await DB.db.gitRepositories.add(repo as DB.GitRepositoryDB);
  }

  static async updateGitRepository(id: string, updates: Partial<DB.GitRepositoryDB>): Promise<void> {
    await DB.db.gitRepositories.update(id, updates);
  }

  static async deleteGitRepository(id: string): Promise<void> {
    await DB.db.gitRepositories.delete(id);
  }

  // ==================== AI CONTEXTS ====================
  static async getAIContext(projectId: string): Promise<DB.AIContextDB | undefined> {
    return await DB.db.aiContexts.get(projectId);
  }

  static async getAllAIContexts(): Promise<DB.AIContextDB[]> {
    return await DB.db.aiContexts.toArray();
  }

  static async addAIContext(context: DB.AIContextDB): Promise<string> {
    return await DB.db.aiContexts.add(context);
  }

  static async updateAIContext(projectId: string, updates: Partial<DB.AIContextDB>): Promise<void> {
    await DB.db.aiContexts.update(projectId, updates);
  }

  static async deleteAIContext(projectId: string): Promise<void> {
    await DB.db.aiContexts.delete(projectId);
  }

  // ==================== KNOWLEDGE NODES ====================
  static async getKnowledgeNode(id: string): Promise<DB.KnowledgeNodeDB | undefined> {
    return await DB.db.knowledgeNodes.get(id);
  }

  static async getAllKnowledgeNodes(): Promise<DB.KnowledgeNodeDB[]> {
    return await DB.db.knowledgeNodes.toArray();
  }

  static async addKnowledgeNode(node: Omit<DB.KnowledgeNodeDB, 'id'>): Promise<string> {
    return await DB.db.knowledgeNodes.add(node as DB.KnowledgeNodeDB);
  }

  static async updateKnowledgeNode(id: string, updates: Partial<DB.KnowledgeNodeDB>): Promise<void> {
    await DB.db.knowledgeNodes.update(id, updates);
  }

  static async deleteKnowledgeNode(id: string): Promise<void> {
    await DB.db.knowledgeNodes.delete(id);
  }

  // ==================== CONTEXT MEMORIES ====================
  static async getContextMemory(id: string): Promise<DB.ContextMemoryDB | undefined> {
    return await DB.db.contextMemories.get(id);
  }

  static async getAllContextMemories(): Promise<DB.ContextMemoryDB[]> {
    return await DB.db.contextMemories.toArray();
  }

  static async addContextMemory(memory: Omit<DB.ContextMemoryDB, 'id'>): Promise<string> {
    return await DB.db.contextMemories.add(memory as DB.ContextMemoryDB);
  }

  static async updateContextMemory(id: string, updates: Partial<DB.ContextMemoryDB>): Promise<void> {
    await DB.db.contextMemories.update(id, updates);
  }

  static async deleteContextMemory(id: string): Promise<void> {
    await DB.db.contextMemories.delete(id);
  }

  // ==================== AGENT ASSIGNMENTS ====================
  static async getAgentAssignment(id: string): Promise<DB.AgentAssignmentDB | undefined> {
    return await DB.db.agentAssignments.get(id);
  }

  static async getAllAgentAssignments(): Promise<DB.AgentAssignmentDB[]> {
    return await DB.db.agentAssignments.toArray();
  }

  static async addAgentAssignment(assignment: Omit<DB.AgentAssignmentDB, 'id'>): Promise<string> {
    return await DB.db.agentAssignments.add(assignment as DB.AgentAssignmentDB);
  }

  static async updateAgentAssignment(id: string, updates: Partial<DB.AgentAssignmentDB>): Promise<void> {
    await DB.db.agentAssignments.update(id, updates);
  }

  static async deleteAgentAssignment(id: string): Promise<void> {
    await DB.db.agentAssignments.delete(id);
  }

  // ==================== AI PROVIDERS ====================
  static async getAIProvider(id: string): Promise<DB.AIProviderDB | undefined> {
    return await DB.db.aiProviders.get(id);
  }

  static async getAllAIProviders(): Promise<DB.AIProviderDB[]> {
    return await DB.db.aiProviders.toArray();
  }

  static async addAIProvider(provider: Omit<DB.AIProviderDB, 'id'>): Promise<string> {
    return await DB.db.aiProviders.add(provider as DB.AIProviderDB);
  }

  static async updateAIProvider(id: string, updates: Partial<DB.AIProviderDB>): Promise<void> {
    await DB.db.aiProviders.update(id, updates);
  }

  static async deleteAIProvider(id: string): Promise<void> {
    await DB.db.aiProviders.delete(id);
  }

  // ==================== AI ACCOUNTS ====================
  static async getAIAccount(id: string): Promise<DB.AIAccountDB | undefined> {
    return await DB.db.aiAccounts.get(id);
  }

  static async getAllAIAccounts(): Promise<DB.AIAccountDB[]> {
    return await DB.db.aiAccounts.toArray();
  }

  static async addAIAccount(account: Omit<DB.AIAccountDB, 'id'>): Promise<string> {
    return await DB.db.aiAccounts.add(account as DB.AIAccountDB);
  }

  static async updateAIAccount(id: string, updates: Partial<DB.AIAccountDB>): Promise<void> {
    await DB.db.aiAccounts.update(id, updates);
  }

  static async deleteAIAccount(id: string): Promise<void> {
    await DB.db.aiAccounts.delete(id);
  }

  // ==================== RATE LIMITS ====================
  static async getRateLimit(accountId: string): Promise<DB.RateLimitDB | undefined> {
    return await DB.db.rateLimits.get(accountId);
  }

  static async getAllRateLimits(): Promise<DB.RateLimitDB[]> {
    return await DB.db.rateLimits.toArray();
  }

  static async addRateLimit(limit: DB.RateLimitDB): Promise<string> {
    return await DB.db.rateLimits.add(limit);
  }

  static async updateRateLimit(accountId: string, updates: Partial<DB.RateLimitDB>): Promise<void> {
    await DB.db.rateLimits.update(accountId, updates);
  }

  static async deleteRateLimit(accountId: string): Promise<void> {
    await DB.db.rateLimits.delete(accountId);
  }

  // ==================== USAGES ====================
  static async getUsage(accountId: string): Promise<DB.UsageDB | undefined> {
    return await DB.db.usages.get(accountId);
  }

  static async getAllUsages(): Promise<DB.UsageDB[]> {
    return await DB.db.usages.toArray();
  }

  static async addUsage(usage: DB.UsageDB): Promise<string> {
    return await DB.db.usages.add(usage);
  }

  static async updateUsage(accountId: string, updates: Partial<DB.UsageDB>): Promise<void> {
    await DB.db.usages.update(accountId, updates);
  }

  static async deleteUsage(accountId: string): Promise<void> {
    await DB.db.usages.delete(accountId);
  }

  // ==================== PROVIDER CONFIGS ====================
  static async getProviderConfig(providerId: string): Promise<DB.ProviderConfigDB | undefined> {
    return await DB.db.providerConfigs.get(providerId);
  }

  static async getAllProviderConfigs(): Promise<DB.ProviderConfigDB[]> {
    return await DB.db.providerConfigs.toArray();
  }

  static async addProviderConfig(config: DB.ProviderConfigDB): Promise<string> {
    return await DB.db.providerConfigs.add(config);
  }

  static async updateProviderConfig(providerId: string, updates: Partial<DB.ProviderConfigDB>): Promise<void> {
    await DB.db.providerConfigs.update(providerId, updates);
  }

  static async deleteProviderConfig(providerId: string): Promise<void> {
    await DB.db.providerConfigs.delete(providerId);
  }

  // ==================== AGENTS ====================
  static async getAgent(id: string): Promise<DB.AgentDB | undefined> {
    return await DB.db.agents.get(id);
  }

  static async getAllAgents(): Promise<DB.AgentDB[]> {
    return await DB.db.agents.toArray();
  }

  static async addAgent(agent: Omit<DB.AgentDB, 'id'>): Promise<string> {
    return await DB.db.agents.add(agent as DB.AgentDB);
  }

  static async updateAgent(id: string, updates: Partial<DB.AgentDB>): Promise<void> {
    await DB.db.agents.update(id, updates);
  }

  static async deleteAgent(id: string): Promise<void> {
    await DB.db.agents.delete(id);
  }

  // ==================== AGENT PERFORMANCES ====================
  static async getAgentPerformance(agentId: string): Promise<DB.AgentPerformanceDB | undefined> {
    return await DB.db.agentPerformances.get(agentId);
  }

  static async getAllAgentPerformances(): Promise<DB.AgentPerformanceDB[]> {
    return await DB.db.agentPerformances.toArray();
  }

  static async addAgentPerformance(performance: DB.AgentPerformanceDB): Promise<string> {
    return await DB.db.agentPerformances.add(performance);
  }

  static async updateAgentPerformance(agentId: string, updates: Partial<DB.AgentPerformanceDB>): Promise<void> {
    await DB.db.agentPerformances.update(agentId, updates);
  }

  static async deleteAgentPerformance(agentId: string): Promise<void> {
    await DB.db.agentPerformances.delete(agentId);
  }

  // ==================== AGENT CONFIGS ====================
  static async getAgentConfig(agentId: string): Promise<DB.AgentConfigDB | undefined> {
    return await DB.db.agentConfigs.get(agentId);
  }

  static async getAllAgentConfigs(): Promise<DB.AgentConfigDB[]> {
    return await DB.db.agentConfigs.toArray();
  }

  static async addAgentConfig(config: DB.AgentConfigDB): Promise<string> {
    return await DB.db.agentConfigs.add(config);
  }

  static async updateAgentConfig(agentId: string, updates: Partial<DB.AgentConfigDB>): Promise<void> {
    await DB.db.agentConfigs.update(agentId, updates);
  }

  static async deleteAgentConfig(agentId: string): Promise<void> {
    await DB.db.agentConfigs.delete(agentId);
  }

  // ==================== TASKS ====================
  static async getTask(id: string): Promise<DB.TaskDB | undefined> {
    return await DB.db.tasks.get(id);
  }

  static async getAllTasks(): Promise<DB.TaskDB[]> {
    return await DB.db.tasks.toArray();
  }

  static async addTask(task: Omit<DB.TaskDB, 'id'>): Promise<string> {
    return await DB.db.tasks.add(task as DB.TaskDB);
  }

  static async updateTask(id: string, updates: Partial<DB.TaskDB>): Promise<void> {
    await DB.db.tasks.update(id, updates);
  }

  static async deleteTask(id: string): Promise<void> {
    await DB.db.tasks.delete(id);
  }

  // ==================== TASK RESULTS ====================
  static async getTaskResult(taskId: string): Promise<DB.TaskResultDB | undefined> {
    return await DB.db.taskResults.get(taskId);
  }

  static async getAllTaskResults(): Promise<DB.TaskResultDB[]> {
    return await DB.db.taskResults.toArray();
  }

  static async addTaskResult(result: DB.TaskResultDB): Promise<string> {
    return await DB.db.taskResults.add(result);
  }

  static async updateTaskResult(taskId: string, updates: Partial<DB.TaskResultDB>): Promise<void> {
    await DB.db.taskResults.update(taskId, updates);
  }

  static async deleteTaskResult(taskId: string): Promise<void> {
    await DB.db.taskResults.delete(taskId);
  }

  // ==================== CHAT MESSAGES ====================
  static async getChatMessage(id: string): Promise<DB.ChatMessageDB | undefined> {
    return await DB.db.chatMessages.get(id);
  }

  static async getAllChatMessages(): Promise<DB.ChatMessageDB[]> {
    return await DB.db.chatMessages.toArray();
  }

  static async getMessages(projectId?: string): Promise<DB.ChatMessageDB[]> {
    if (projectId) {
      return await DB.db.chatMessages.where('projectId').equals(projectId).toArray();
    }
    return await DB.db.chatMessages.toArray();
  }

  static async addChatMessage(message: Omit<DB.ChatMessageDB, 'id'>): Promise<string> {
    return await DB.db.chatMessages.add(message as DB.ChatMessageDB);
  }

  static async updateChatMessage(id: string, updates: Partial<DB.ChatMessageDB>): Promise<void> {
    await DB.db.chatMessages.update(id, updates);
  }

  static async deleteChatMessage(id: string): Promise<void> {
    await DB.db.chatMessages.delete(id);
  }

  // ==================== VECTOR INDEXES ====================
  static async getVectorIndex(id: string): Promise<DB.VectorIndexDB | undefined> {
    return await DB.db.vectorIndexes.get(id);
  }

  static async getAllVectorIndexes(): Promise<DB.VectorIndexDB[]> {
    return await DB.db.vectorIndexes.toArray();
  }

  static async addVectorIndex(index: Omit<DB.VectorIndexDB, 'id'>): Promise<string> {
    return await DB.db.vectorIndexes.add(index as DB.VectorIndexDB);
  }

  static async updateVectorIndex(id: string, updates: Partial<DB.VectorIndexDB>): Promise<void> {
    await DB.db.vectorIndexes.update(id, updates);
  }

  static async deleteVectorIndex(id: string): Promise<void> {
    await DB.db.vectorIndexes.delete(id);
  }

  // ==================== INDEX ENTRIES ====================
  static async getIndexEntry(id: string): Promise<DB.IndexEntryDB | undefined> {
    return await DB.db.indexEntries.get(id);
  }

  static async getAllIndexEntries(): Promise<DB.IndexEntryDB[]> {
    return await DB.db.indexEntries.toArray();
  }

  static async addIndexEntry(entry: Omit<DB.IndexEntryDB, 'id'>): Promise<string> {
    return await DB.db.indexEntries.add(entry as DB.IndexEntryDB);
  }

  static async updateIndexEntry(id: string, updates: Partial<DB.IndexEntryDB>): Promise<void> {
    await DB.db.indexEntries.update(id, updates);
  }

  static async deleteIndexEntry(id: string): Promise<void> {
    await DB.db.indexEntries.delete(id);
  }

  // ==================== PERFORMANCE METRICS ====================
  static async getPerformanceMetric(id: string): Promise<DB.PerformanceMetricDB | undefined> {
    return await DB.db.performanceMetrics.get(id);
  }

  static async getPerformanceMetrics(options: {
    type?: string;
    service?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.PerformanceMetricDB[]> {
    let query = DB.db.performanceMetrics.toCollection();

    if (options.type) {
      query = query.filter(metric => metric.type === options.type);
    }

    if (options.service) {
      query = query.filter(metric => metric.service === options.service);
    }

    if (options.startTime || options.endTime) {
      query = query.filter(metric =>
        metric.timestamp >= (options.startTime || new Date(0)) &&
        metric.timestamp <= (options.endTime || new Date())
      );
    }

    const results = await query.reverse().limit(options.limit || 1000).toArray();
    return results;
  }

  static async addPerformanceMetric(metric: Omit<DB.PerformanceMetricDB, 'id'>): Promise<string> {
    return await DB.db.performanceMetrics.add(metric as DB.PerformanceMetricDB);
  }

  static async deleteOldPerformanceMetrics(cutoffDate: Date): Promise<void> {
    await DB.db.performanceMetrics.where('timestamp').below(cutoffDate).delete();
  }

  // ==================== WEB VITALS ====================
  static async getWebVital(id: string): Promise<DB.WebVitalDB | undefined> {
    return await DB.db.webVitals.get(id);
  }

  static async getWebVitals(options: {
    metric?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.WebVitalDB[]> {
    let query = DB.db.webVitals.toCollection();

    if (options.metric) {
      query = query.filter(vital => vital.metric === options.metric);
    }

    if (options.startTime || options.endTime) {
      query = query.filter(vital =>
        vital.timestamp >= (options.startTime || new Date(0)) &&
        vital.timestamp <= (options.endTime || new Date())
      );
    }

    const results = await query.reverse().limit(options.limit || 1000).toArray();
    return results;
  }

  static async addWebVital(vital: Omit<DB.WebVitalDB, 'id'>): Promise<string> {
    return await DB.db.webVitals.add(vital as DB.WebVitalDB);
  }

  static async deleteOldWebVitals(cutoffDate: Date): Promise<void> {
    await DB.db.webVitals.where('timestamp').below(cutoffDate).delete();
  }

  // ==================== ERROR LOGS ====================
  static async getErrorLog(id: string): Promise<DB.ErrorLogDB | undefined> {
    return await DB.db.errorLogs.get(id);
  }

  static async getErrorLogs(options: {
    level?: string;
    service?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<DB.ErrorLogDB[]> {
    let query = DB.db.errorLogs.toCollection();

    if (options.level) {
      query = query.filter(log => log.level === options.level);
    }

    if (options.service) {
      query = query.filter(log => log.service === options.service);
    }

    if (options.startTime || options.endTime) {
      query = query.filter(log =>
        log.timestamp >= (options.startTime || new Date(0)) &&
        log.timestamp <= (options.endTime || new Date())
      );
    }

    const results = await query.reverse().limit(options.limit || 1000).toArray();
    return results;
  }

  static async addErrorLog(error: Omit<DB.ErrorLogDB, 'id'>): Promise<string> {
    return await DB.db.errorLogs.add(error as DB.ErrorLogDB);
  }

  static async deleteOldErrorLogs(cutoffDate: Date): Promise<void> {
    await DB.db.errorLogs.where('timestamp').below(cutoffDate).delete();
  }

  // ==================== VECTOR DATABASE ====================
  static async getVectorDatabaseData(): Promise<any> {
    const data = await DB.db.vectorDatabase.get(1);
    return data ? data.data : {};
  }

  static async saveVectorDatabaseData(data: any): Promise<void> {
    await DB.db.vectorDatabase.put({ id: 1, data });
  }
  static async getTasks(projectId?: string): Promise<DB.TaskDB[]> {
    if (projectId) {
      return await DB.db.tasks.where('projectId').equals(projectId).toArray();
    }
    return await DB.db.tasks.toArray();
  }
}