import { enhancedVectorDatabase } from './enhancedVectorDatabase';
import { localEmbeddingGenerator } from './localEmbeddingGenerator';
import { StorageService } from './StorageService';
import { KnowledgeNode } from './types';

interface GraphConfig {
  maxNodes: number;
  maxConnections: number;
  similarityThreshold: number;
  autoConnect: boolean;
  updateInterval: number;
  pruningThreshold: number;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'semantic' | 'structural' | 'temporal' | 'categorical' | 'hierarchical';
  weight: number;
  metadata: Record<string, any>;
  createdAt: Date;
  lastAccessed: Date;
}

interface GraphPath {
  nodes: KnowledgeNode[];
  edges: GraphEdge[];
  totalWeight: number;
  pathType: 'shortest' | 'semantic' | 'structural';
}

interface GraphCluster {
  id: string;
  nodes: string[];
  centroid: number[];
  radius: number;
  cohesion: number;
  type: 'thematic' | 'functional' | 'temporal';
  metadata: Record<string, any>;
}

interface GraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  clusteringCoefficient: number;
  pathLength: number;
  connectedComponents: number;
  density: number;
  centrality: Record<string, number>;
}

class KnowledgeGraphSystem {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();
  private clusters: Map<string, GraphCluster> = new Map();
  private graphConfig: GraphConfig = {
    maxNodes: 50000,
    maxConnections: 100,
    similarityThreshold: 0.6,
    autoConnect: true,
    updateInterval: 3600000, // 1 hour
    pruningThreshold: 0.1
  };
  private isInitialized = false;
  private lastUpdate = new Date();

  async initialize(config?: Partial<GraphConfig>): Promise<void> {
    try {
      console.log('Initializing Knowledge Graph System...');
      
      // Update configuration
      if (config) {
        this.graphConfig = { ...this.graphConfig, ...config };
      }

      // Load existing graph data
      await this.loadGraphData();
      
      // Start automatic updates
      this.startGraphMaintenance();
      
      this.isInitialized = true;
      console.log('Knowledge Graph System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph System:', error);
      throw error;
    }
  }

  private async loadGraphData(): Promise<void> {
    try {
      const allNodes = await StorageService.getAllKnowledgeNodes();

      for (const node of allNodes) {
        switch (node.type) {
          case 'file': {
            const edge = this.parseEdgeNode(node as any);
            if (edge) this.edges.set(edge.id, edge);
            break;
          }
          case 'function': {
            const cluster = this.parseClusterNode(node as any);
            if (cluster) this.clusters.set(cluster.id, cluster);
            break;
          }
          default:
            this.nodes.set(node.id, node as any);
            break;
        }
      }

      // Build adjacency list
      this.buildAdjacencyList();

      console.log(`Loaded ${this.nodes.size} nodes, ${this.edges.size} edges, ${this.clusters.size} clusters`);
    } catch (error) {
      console.error('Failed to load graph data:', error);
    }
  }

  private parseEdgeNode(node: KnowledgeNode): GraphEdge | null {
    try {
      if (node.type !== 'file' || !node.content) return null;
      
      const edgeData = JSON.parse(node.content);
      return {
        id: node.id,
        sourceId: edgeData.sourceId,
        targetId: edgeData.targetId,
        type: edgeData.type,
        weight: edgeData.weight,
        metadata: edgeData.metadata || {},
        createdAt: new Date(edgeData.createdAt),
        lastAccessed: new Date(edgeData.lastAccessed)
      };
    } catch (error) {
      console.error('Failed to parse edge node:', error);
      return null;
    }
  }

  private parseClusterNode(node: KnowledgeNode): GraphCluster | null {
    try {
      if (node.type !== 'file' || !node.content) return null;
      
      const clusterData = JSON.parse(node.content);
      return {
        id: node.id,
        nodes: clusterData.nodes,
        centroid: clusterData.centroid,
        radius: clusterData.radius,
        cohesion: clusterData.cohesion,
        type: clusterData.type,
        metadata: clusterData.metadata || {}
      };
    } catch (error) {
      console.error('Failed to parse cluster node:', error);
      return null;
    }
  }

  private buildAdjacencyList(): void {
    this.adjacencyList.clear();
    
    for (const edge of this.edges.values()) {
      if (!this.adjacencyList.has(edge.sourceId)) {
        this.adjacencyList.set(edge.sourceId, []);
      }
      if (!this.adjacencyList.has(edge.targetId)) {
        this.adjacencyList.set(edge.targetId, []);
      }
      
      this.adjacencyList.get(edge.sourceId)!.push(edge.targetId);
      this.adjacencyList.get(edge.targetId)!.push(edge.sourceId);
    }
  }

  private startGraphMaintenance(): void {
    // Run graph updates periodically
    setInterval(() => {
      this.performGraphUpdate();
    }, this.graphConfig.updateInterval);

    // Run graph pruning
    setInterval(() => {
      this.performGraphPruning();
    }, this.graphConfig.updateInterval * 2);
  }

  async addNode(
    content: string,
    type: 'file' | 'function' | 'concept' | 'pattern',
    metadata: Record<string, any> = {},
    projectId?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const nodeId = this.generateNodeId(content, type);
    
    // Generate embedding
    const embeddingResult = await localEmbeddingGenerator.generateEmbedding(content, {
      type: type === 'file' || type === 'function' ? 'code' : 'text',
      useCache: true
    });

    const node: KnowledgeNode = {
      id: nodeId,
      type,
      content,
      connections: [],
      embedding: embeddingResult.embedding,
      relevanceScore: this.calculateNodeRelevance(content, type, metadata),
      metadata: {
        ...metadata,
        embeddingModel: embeddingResult.model,
        dimensions: embeddingResult.dimensions,
        createdAt: new Date().toISOString()
      },
      projectId: projectId || ''
    };

    // Add to graph
    this.nodes.set(nodeId, node);
    this.adjacencyList.set(nodeId, []);

    // Save to storage
    if (await StorageService.getKnowledgeNode(node.id)) {
        await StorageService.updateKnowledgeNode(node.id, node as any);
    } else {
        await StorageService.addKnowledgeNode(node as any);
    }

    // Auto-connect if enabled
    if (this.graphConfig.autoConnect) {
      await this.autoConnectNode(nodeId);
    }

    return nodeId;
  }

  private generateNodeId(content: string, type: string): string {
    const timestamp = Date.now();
    const contentHash = this.simpleHash(content);
    return `node_${type}_${contentHash}_${timestamp}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private calculateNodeRelevance(content: string, type: string, metadata: Record<string, any>): number {
    let score = 0.5; // Base score

    // Type-based relevance
    const typeWeights = {
      'function': 0.9,
      'concept': 0.8,
      'pattern': 0.7,
      'file': 0.6
    };
    score += typeWeights[type] || 0.5;

    // Content length relevance
    if (content.length > 500) score += 0.1;
    if (content.length > 2000) score += 0.1;

    // Metadata relevance
    if (metadata.isPublic) score += 0.1;
    if (metadata.isCore) score += 0.2;
    if (metadata.language) score += 0.1;
    if (metadata.framework) score += 0.1;

    return Math.min(score, 1.0);
  }

  private async autoConnectNode(nodeId: string): Promise<void> {
    const newNode = this.nodes.get(nodeId);
    if (!newNode) return;

    const candidateNodes = Array.from(this.nodes.values()).filter(node => node.id !== nodeId);
    
    // Find similar nodes
    const similarNodes = await this.findSimilarNodes(newNode, candidateNodes, 10);
    
    // Create edges to similar nodes
    for (const similarNode of similarNodes) {
      if (this.edges.size >= this.graphConfig.maxConnections) break;
      
      await this.addEdge(
        nodeId,
        similarNode.node.id,
        'semantic',
        similarNode.similarity,
        { autoGenerated: true }
      );
    }
  }

  private async findSimilarNodes(
    targetNode: KnowledgeNode,
    candidateNodes: KnowledgeNode[],
    limit: number
  ): Promise<{ node: KnowledgeNode; similarity: number }[]> {
    const similarities: { node: KnowledgeNode; similarity: number }[] = [];
    
    for (const candidate of candidateNodes) {
      const similarity = this.cosineSimilarity(targetNode.embedding, candidate.embedding);
      
      if (similarity >= this.graphConfig.similarityThreshold) {
        similarities.push({ node: candidate, similarity });
      }
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async addEdge(
    sourceId: string,
    targetId: string,
    type: 'semantic' | 'structural' | 'temporal' | 'categorical' | 'hierarchical',
    weight: number,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error('Source or target node not found');
    }

    const edgeId = this.generateEdgeId(sourceId, targetId, type);
    
    const edge: GraphEdge = {
      id: edgeId,
      sourceId,
      targetId,
      type,
      weight,
      metadata,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    // Add edge
    this.edges.set(edgeId, edge);
    
    // Update adjacency list
    if (!this.adjacencyList.has(sourceId)) {
      this.adjacencyList.set(sourceId, []);
    }
    if (!this.adjacencyList.has(targetId)) {
      this.adjacencyList.set(targetId, []);
    }
    
    this.adjacencyList.get(sourceId)!.push(targetId);
    this.adjacencyList.get(targetId)!.push(sourceId);
    
    // Update node connections
    const sourceNode = this.nodes.get(sourceId)!;
    const targetNode = this.nodes.get(targetId)!;
    
    if (!sourceNode.connections.includes(targetId)) {
      sourceNode.connections.push(targetId);
    }
    if (!targetNode.connections.includes(sourceId)) {
      targetNode.connections.push(sourceId);
    }
    
    // Save edge as knowledge node
    await this.saveEdgeAsNode(edge);
    
    // Update nodes
    await StorageService.updateKnowledgeNode(sourceNode.id, sourceNode as any);
    await StorageService.updateKnowledgeNode(targetNode.id, targetNode as any);

    return edgeId;
  }

  private generateEdgeId(sourceId: string, targetId: string, type: string): string {
    return `edge_${sourceId}_${targetId}_${type}_${Date.now()}`;
  }

  private async saveEdgeAsNode(edge: GraphEdge): Promise<void> {
    const edgeNode: KnowledgeNode = {
      id: edge.id,
      type: 'file',
      content: JSON.stringify({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        weight: edge.weight,
        metadata: edge.metadata,
        createdAt: edge.createdAt.toISOString(),
        lastAccessed: edge.lastAccessed.toISOString()
      }),
      connections: [edge.sourceId, edge.targetId],
      embedding: new Array(512).fill(0), // Placeholder embedding
      relevanceScore: edge.weight,
      metadata: {
        edgeType: edge.type,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        weight: edge.weight
      },
      projectId: ''
    };

    if (await StorageService.getKnowledgeNode(edgeNode.id)) {
        await StorageService.updateKnowledgeNode(edgeNode.id, edgeNode as any);
    } else {
        await StorageService.addKnowledgeNode(edgeNode as any);
    }
  }

  async findPath(
    sourceId: string,
    targetId: string,
    options: {
      algorithm?: 'dijkstra' | 'astar' | 'bfs';
      pathType?: 'shortest' | 'semantic' | 'structural';
      maxDepth?: number;
    } = {}
  ): Promise<GraphPath | null> {
    const {
      algorithm = 'dijkstra',
      pathType = 'shortest',
      maxDepth = 10
    } = options;

    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }

    switch (algorithm) {
      case 'dijkstra':
        return this.dijkstraPath(sourceId, targetId, pathType, maxDepth);
      case 'astar':
        return this.astarPath(sourceId, targetId, pathType, maxDepth);
      case 'bfs':
        return this.bfsPath(sourceId, targetId, maxDepth);
      default:
        return this.dijkstraPath(sourceId, targetId, pathType, maxDepth);
    }
  }

  private dijkstraPath(
    sourceId: string,
    targetId: string,
    pathType: 'shortest' | 'semantic' | 'structural',
    maxDepth: number
  ): GraphPath | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const unvisited = new Set<string>();

    // Initialize distances
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }
    distances.set(sourceId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode = '';
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        if (distances.get(nodeId)! < minDistance) {
          minDistance = distances.get(nodeId)!;
          currentNode = nodeId;
        }
      }

      if (currentNode === '' || minDistance === Infinity) break;
      
      unvisited.delete(currentNode);
      
      if (currentNode === targetId) break;
      
      // Check neighbors
      const neighbors = this.adjacencyList.get(currentNode) || [];
      for (const neighborId of neighbors) {
        if (!unvisited.has(neighborId)) continue;
        
        const edge = this.findEdge(currentNode, neighborId);
        if (!edge) continue;
        
        // Calculate edge weight based on path type
        let edgeWeight = edge.weight;
        if (pathType === 'semantic') {
          edgeWeight = 1 - edgeWeight; // Invert for semantic similarity
        } else if (pathType === 'structural') {
          edgeWeight = edge.type === 'structural' ? edge.weight * 0.5 : edgeWeight;
        }
        
        const altDistance = distances.get(currentNode)! + edgeWeight;
        
        if (altDistance < distances.get(neighborId)!) {
          distances.set(neighborId, altDistance);
          previous.set(neighborId, currentNode);
        }
      }
    }

    // Reconstruct path
    return this.reconstructPath(sourceId, targetId, previous, pathType);
  }

  private astarPath(
    sourceId: string,
    targetId: string,
    pathType: 'shortest' | 'semantic' | 'structural',
    maxDepth: number
  ): GraphPath | null {
    // Simplified A* implementation
    const openSet = new Set<string>([sourceId]);
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string>();

    // Initialize scores
    for (const nodeId of this.nodes.keys()) {
      gScore.set(nodeId, Infinity);
      fScore.set(nodeId, Infinity);
    }
    
    gScore.set(sourceId, 0);
    fScore.set(sourceId, this.heuristic(sourceId, targetId, pathType));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = '';
      let minFScore = Infinity;
      
      for (const nodeId of openSet) {
        if (fScore.get(nodeId)! < minFScore) {
          minFScore = fScore.get(nodeId)!;
          current = nodeId;
        }
      }

      if (current === targetId) {
        return this.reconstructPath(sourceId, targetId, previous, pathType);
      }

      openSet.delete(current);
      closedSet.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;

        const edge = this.findEdge(current, neighborId);
        if (!edge) continue;

        let edgeWeight = edge.weight;
        if (pathType === 'semantic') {
          edgeWeight = 1 - edge.weight;
        } else if (pathType === 'structural') {
          edgeWeight = edge.type === 'structural' ? edgeWeight * 0.5 : edgeWeight;
        }

        const tentativeGScore = gScore.get(current)! + edgeWeight;

        if (tentativeGScore < gScore.get(neighborId)!) {
          previous.set(neighborId, current);
          gScore.set(neighborId, tentativeGScore);
          fScore.set(neighborId, tentativeGScore + this.heuristic(neighborId, targetId, pathType));
          
          if (!openSet.has(neighborId)) {
            openSet.add(neighborId);
          }
        }
      }
    }

    return null;
  }

  private bfsPath(
    sourceId: string,
    targetId: string,
    maxDepth: number
  ): GraphPath | null {
    const queue = [sourceId];
    const visited = new Set<string>([sourceId]);
    const previous = new Map<string, string>();
    const depth = new Map<string, number>();
    depth.set(sourceId, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === targetId) {
        return this.reconstructPath(sourceId, targetId, previous, 'shortest');
      }

      if (depth.get(current)! >= maxDepth) continue;

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          previous.set(neighborId, current);
          depth.set(neighborId, depth.get(current)! + 1);
          queue.push(neighborId);
        }
      }
    }

    return null;
  }

  private heuristic(nodeId: string, targetId: string, pathType: 'shortest' | 'semantic' | 'structural'): number {
    const nodeA = this.nodes.get(nodeId);
    const nodeB = this.nodes.get(targetId);
    
    if (!nodeA || !nodeB) return Infinity;

    if (pathType === 'semantic') {
      // Use embedding similarity as heuristic
      return 1 - this.cosineSimilarity(nodeA.embedding, nodeB.embedding);
    } else {
      // Use simple distance heuristic
      return 1; // Placeholder
    }
  }

  private findEdge(sourceId: string, targetId: string): GraphEdge | null {
    for (const edge of this.edges.values()) {
      if ((edge.sourceId === sourceId && edge.targetId === targetId) ||
          (edge.sourceId === targetId && edge.targetId === sourceId)) {
        return edge;
      }
    }
    return null;
  }

  private reconstructPath(
    sourceId: string,
    targetId: string,
    previous: Map<string, string>,
    pathType: 'shortest' | 'semantic' | 'structural'
  ): GraphPath | null {
    const path: string[] = [];
    const edges: GraphEdge[] = [];
    let current = targetId;

    while (current !== sourceId) {
      if (!previous.has(current)) return null;
      
      path.unshift(current);
      const prev = previous.get(current)!;
      
      const edge = this.findEdge(prev, current);
      if (edge) {
        edges.push(edge);
      }
      
      current = prev;
    }

    path.unshift(sourceId);

    const nodes = path.map(nodeId => this.nodes.get(nodeId)!);
    const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0);

    return {
      nodes,
      edges,
      totalWeight,
      pathType
    };
  }

  async findRelatedConcepts(
    conceptId: string,
    options: {
      limit?: number;
      type?: 'semantic' | 'structural' | 'temporal' | 'categorical' | 'hierarchical';
      minWeight?: number;
    } = {}
  ): Promise<{ node: KnowledgeNode; edge: GraphEdge; relationship: string }[]> {
    const {
      limit = 10,
      type,
      minWeight = 0.3
    } = options;

    const conceptNode = this.nodes.get(conceptId);
    if (!conceptNode) {
      throw new Error(`Concept ${conceptId} not found`);
    }

    const relatedConcepts: { node: KnowledgeNode; edge: GraphEdge; relationship: string }[] = [];
    
    // Get direct connections
    const neighborIds = this.adjacencyList.get(conceptId) || [];
    
    for (const neighborId of neighborIds) {
      const neighborNode = this.nodes.get(neighborId);
      const edge = this.findEdge(conceptId, neighborId);
      
      if (neighborNode && edge && edge.weight >= minWeight) {
        if (!type || edge.type === type) {
          relatedConcepts.push({
            node: neighborNode,
            edge,
            relationship: edge.type
          });
        }
      }
    }

    // Sort by weight and limit results
    return relatedConcepts
      .sort((a, b) => b.edge.weight - a.edge.weight)
      .slice(0, limit);
  }

  async performGraphClustering(): Promise<void> {
    console.log('Performing graph clustering...');
    
    const nodes = Array.from(this.nodes.values());
    if (nodes.length < 10) return;

    // Clear existing clusters
    this.clusters.clear();

    // Perform clustering based on connectivity and similarity
    const clusters = await this.detectClusters(nodes);

    // Save clusters
    for (const cluster of clusters) {
      this.clusters.set(cluster.id, cluster);
      await this.saveClusterAsNode(cluster);
    }

    console.log(`Created ${clusters.length} clusters`);
  }

  private async detectClusters(nodes: KnowledgeNode[]): Promise<GraphCluster[]> {
    const clusters: GraphCluster[] = [];
    const visited = new Set<string>();
    
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      
      // Find connected component
      const component = this.getConnectedComponent(node.id, visited);
      
      if (component.length >= 3) { // Only cluster components with 3+ nodes
        const cluster = await this.createCluster(component);
        if (cluster) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  private getConnectedComponent(startId: string, visited: Set<string>): string[] {
    const component: string[] = [];
    const queue = [startId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      component.push(currentId);
      
      const neighbors = this.adjacencyList.get(currentId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
    
    return component;
  }

  private async createCluster(nodeIds: string[]): Promise<GraphCluster | null> {
    if (nodeIds.length === 0) return null;

    const clusterNodes = nodeIds.map(id => this.nodes.get(id)!);
    
    // Calculate centroid
    const dimensions = clusterNodes[0].embedding.length;
    const centroid = new Array(dimensions).fill(0);
    
    for (const node of clusterNodes) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += node.embedding[i];
      }
    }
    
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= clusterNodes.length;
    }

    // Calculate radius and cohesion
    let maxDistance = 0;
    let totalDistance = 0;
    
    for (const node of clusterNodes) {
      const distance = this.cosineSimilarity(centroid, node.embedding);
      maxDistance = Math.max(maxDistance, 1 - distance);
      totalDistance += 1 - distance;
    }

    const radius = maxDistance;
    const cohesion = 1 - (totalDistance / clusterNodes.length);

    const cluster: GraphCluster = {
      id: `cluster_${Date.now()}_${nodeIds.length}`,
      nodes: nodeIds,
      centroid,
      radius,
      cohesion,
      type: cohesion > 0.7 ? 'thematic' : cohesion > 0.5 ? 'functional' : 'temporal',
      metadata: {
        nodeCount: nodeIds.length,
        averageRelevance: clusterNodes.reduce((sum, node) => sum + node.relevanceScore, 0) / clusterNodes.length,
        createdAt: new Date().toISOString()
      }
    };

    return cluster;
  }

  private async saveClusterAsNode(cluster: GraphCluster): Promise<void> {
    const clusterNode: KnowledgeNode = {
      id: cluster.id,
      type: 'cluster',
      content: JSON.stringify({
        nodes: cluster.nodes,
        centroid: cluster.centroid,
        radius: cluster.radius,
        cohesion: cluster.cohesion,
        type: cluster.type,
        metadata: cluster.metadata
      }),
      connections: cluster.nodes,
      embedding: cluster.centroid,
      relevanceScore: cluster.cohesion,
      metadata: {
        clusterType: cluster.type,
        nodeCount: cluster.nodes.length,
        cohesion: cluster.cohesion
      },
      projectId: ''
    };

    if (await StorageService.getKnowledgeNode(clusterNode.id)) {
        await StorageService.updateKnowledgeNode(clusterNode.id, clusterNode as any);
    } else {
        await StorageService.addKnowledgeNode(clusterNode as any);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  async performGraphUpdate(): Promise<void> {
    console.log('Performing graph update...');
    
    // Update node relevance scores
    await this.updateNodeRelevance();
    
    // Update edge weights
    await this.updateEdgeWeights();
    
    // Perform clustering if needed
    if (Date.now() - this.lastUpdate.getTime() > this.graphConfig.updateInterval) {
      await this.performGraphClustering();
      this.lastUpdate = new Date();
    }
    
    console.log('Graph update completed');
  }

  private async updateNodeRelevance(): Promise<void> {
    for (const node of this.nodes.values()) {
      // Calculate new relevance based on connections and recency
      const connectionCount = node.connections.length;
      const age = Date.now() - new Date(node.metadata.createdAt || 0).getTime();
      const ageInDays = age / (24 * 60 * 60 * 1000);
      
      // Relevance decay over time
      const decayFactor = Math.exp(-ageInDays / 30);
      
      // Boost based on connectivity
      const connectivityBoost = Math.min(connectionCount / 10, 0.5);
      
      node.relevanceScore = Math.min(
        (node.relevanceScore * decayFactor) + connectivityBoost,
        1.0
      );
      
      await StorageService.updateKnowledgeNode(node.id, node as any);
    }
  }

  private async updateEdgeWeights(): Promise<void> {
    for (const edge of this.edges.values()) {
      const sourceNode = this.nodes.get(edge.sourceId);
      const targetNode = this.nodes.get(edge.targetId);
      
      if (sourceNode && targetNode) {
        // Update weight based on node relevance and similarity
        const similarity = this.cosineSimilarity(sourceNode.embedding, targetNode.embedding);
        const relevanceFactor = (sourceNode.relevanceScore + targetNode.relevanceScore) / 2;
        
        edge.weight = (similarity * 0.7) + (relevanceFactor * 0.3);
        edge.lastAccessed = new Date();
        
        await this.saveEdgeAsNode(edge);
      }
    }
  }

  async performGraphPruning(): Promise<void> {
    console.log('Performing graph pruning...');
    
    const nodesToRemove: string[] = [];
    const edgesToRemove: string[] = [];
    
    // Prune nodes with low relevance
    for (const node of this.nodes.values()) {
      if (node.relevanceScore < this.graphConfig.pruningThreshold) {
        nodesToRemove.push(node.id);
      }
    }
    
    // Prune edges with low weight
    for (const edge of this.edges.values()) {
      if (edge.weight < this.graphConfig.pruningThreshold) {
        edgesToRemove.push(edge.id);
      }
    }
    
    // Remove nodes
    for (const nodeId of nodesToRemove) {
      await this.removeNode(nodeId);
    }
    
    // Remove edges
    for (const edgeId of edgesToRemove) {
      await this.removeEdge(edgeId);
    }
    
    if (nodesToRemove.length > 0 || edgesToRemove.length > 0) {
      console.log(`Pruned ${nodesToRemove.length} nodes and ${edgesToRemove.length} edges`);
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all connected edges
    const connectedEdges: string[] = [];
    for (const edge of this.edges.values()) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        connectedEdges.push(edge.id);
      }
    }

    for (const edgeId of connectedEdges) {
      await this.removeEdge(edgeId);
    }

    // Remove node
    this.nodes.delete(nodeId);
    this.adjacencyList.delete(nodeId);
    await StorageService.deleteKnowledgeNode(nodeId);
  }

  async removeEdge(edgeId: string): Promise<void> {
    const edge = this.edges.get(edgeId);
    if (!edge) return;

    // Remove edge
    this.edges.delete(edgeId);

    // Update adjacency list
    const sourceNeighbors = this.adjacencyList.get(edge.sourceId) || [];
    const targetNeighbors = this.adjacencyList.get(edge.targetId) || [];
    
    this.adjacencyList.set(
      edge.sourceId,
      sourceNeighbors.filter(id => id !== edge.targetId)
    );
    this.adjacencyList.set(
      edge.targetId,
      targetNeighbors.filter(id => id !== edge.sourceId)
    );

    // Update node connections
    const sourceNode = this.nodes.get(edge.sourceId);
    const targetNode = this.nodes.get(edge.targetId);
    
    if (sourceNode) {
      sourceNode.connections = sourceNode.connections.filter(id => id !== edge.targetId);
      await StorageService.updateKnowledgeNode(sourceNode.id, sourceNode as any);
    }
    
    if (targetNode) {
      targetNode.connections = targetNode.connections.filter(id => id !== edge.sourceId);
      await StorageService.updateKnowledgeNode(targetNode.id, targetNode as any);
    }

    // Remove edge from storage
    await StorageService.deleteKnowledgeNode(edgeId);
  }

  async getGraphAnalytics(): Promise<GraphAnalytics> {
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const averageDegree = totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0;
    
    // Calculate clustering coefficient
    let clusteringCoefficient = 0;
    if (totalNodes > 0) {
      let totalTriangles = 0;
      let totalPossibleTriangles = 0;
      
      for (const nodeId of this.nodes.keys()) {
        const neighbors = this.adjacencyList.get(nodeId) || [];
        const degree = neighbors.length;
        
        if (degree >= 2) {
          let triangles = 0;
          for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
              if (this.adjacencyList.get(neighbors[i])?.includes(neighbors[j])) {
                triangles++;
              }
            }
          }
          
          totalTriangles += triangles;
          totalPossibleTriangles += degree * (degree - 1) / 2;
        }
      }
      
      clusteringCoefficient = totalPossibleTriangles > 0 
        ? totalTriangles / totalPossibleTriangles 
        : 0;
    }

    // Calculate connected components
    const connectedComponents = this.countConnectedComponents();
    
    // Calculate density
    const maxPossibleEdges = totalNodes * (totalNodes - 1) / 2;
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

    // Calculate centrality (simplified degree centrality)
    const centrality: Record<string, number> = {};
    for (const [nodeId, neighbors] of this.adjacencyList) {
      centrality[nodeId] = neighbors.length / (totalNodes - 1);
    }

    return {
      totalNodes,
      totalEdges,
      averageDegree,
      clusteringCoefficient,
      pathLength: 0, // Simplified
      connectedComponents,
      density,
      centrality
    };
  }

  private countConnectedComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.getConnectedComponent(nodeId, visited);
        components++;
      }
    }

    return components;
  }

  async exportGraph(projectId?: string): Promise<{
    nodes: KnowledgeNode[];
    edges: GraphEdge[];
    clusters: GraphCluster[];
  }> {
    let nodes = Array.from(this.nodes.values());
    let edges = Array.from(this.edges.values());
    let clusters = Array.from(this.clusters.values());

    if (projectId) {
      nodes = nodes.filter(node => node.projectId === projectId);
      edges = edges.filter(edge => {
        const sourceNode = this.nodes.get(edge.sourceId);
        const targetNode = this.nodes.get(edge.targetId);
        return sourceNode?.projectId === projectId ||
               targetNode?.projectId === projectId;
      });
      clusters = clusters.filter(cluster =>
        cluster.nodes.some(nodeId => {
          const node = this.nodes.get(nodeId);
          return node?.projectId === projectId;
        })
      );
    }

    return { nodes, edges, clusters };
  }

  updateConfig(config: Partial<GraphConfig>): void {
    this.graphConfig = { ...this.graphConfig, ...config };
  }

  getConfig(): GraphConfig {
    return { ...this.graphConfig };
  }
}

export const knowledgeGraphSystem = new KnowledgeGraphSystem();