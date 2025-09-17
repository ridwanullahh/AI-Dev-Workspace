import React, { useState, useEffect } from 'react'
import { Brain, Search, Network, Database, Eye, Filter, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { semanticMemoryArchitecture } from '../../services/semanticMemory'
import { knowledgeGraphSystem } from '../../services/knowledgeGraph'
import { enhancedVectorDatabase } from '../../services/enhancedVectorDatabase'
import { ContextMemory, KnowledgeNode } from '../../services/types'

interface MemoryViewData {
  memories: ContextMemory[]
  knowledgeNodes: KnowledgeNode[]
  searchResults: any[]
  analytics: {
    totalMemories: number
    averageRelevance: number
    memoryTypes: Record<string, number>
  }
}

export function MemoryPage() {
  const [activeTab, setActiveTab] = useState('memories')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [viewData, setViewData] = useState<MemoryViewData>({
    memories: [],
    knowledgeNodes: [],
    searchResults: [],
    analytics: {
      totalMemories: 0,
      averageRelevance: 0,
      memoryTypes: {}
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    loadMemoryData()
  }, [])

  const loadMemoryData = async () => {
    try {
      setIsLoading(true)

      // Load semantic memories
      const memories = await semanticMemoryArchitecture.exportMemories()

      // Load knowledge graph data
      const graphData = await knowledgeGraphSystem.exportGraph()

      // Get memory analytics
      const analytics = await semanticMemoryArchitecture.getMemoryAnalytics()

      setViewData({
        memories,
        knowledgeNodes: graphData.nodes,
        searchResults: [],
        analytics
      })
    } catch (error) {
      console.error('Failed to load memory data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      // Search vector database
      const vectorResults = await enhancedVectorDatabase.search(searchQuery, {
        limit: 10
      })

      // Search semantic memory
      const memoryResults = await semanticMemoryArchitecture.retrieveMemories(searchQuery, {
        limit: 10,
        type: selectedType === 'all' ? 'all' : (selectedType as 'code' | 'conversation' | 'decision' | 'pattern')
      })

      setSearchResults([...vectorResults, ...memoryResults.memories])
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMemoryTypeColor = (type: string) => {
    const colors = {
      code: 'bg-blue-500',
      conversation: 'bg-green-500',
      decision: 'bg-purple-500',
      pattern: 'bg-orange-500',
      file: 'bg-gray-500',
      function: 'bg-indigo-500',
      concept: 'bg-red-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Memory & Knowledge
          </h1>
          <p className="text-muted-foreground">
            Explore AI memories, knowledge relationships, and search through vector space
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {viewData.analytics.totalMemories} memories
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Network className="h-3 w-3" />
            {viewData.knowledgeNodes.length} concepts
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search memories, knowledge, and vector space..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-32"
          >
            <option value="all">All Types</option>
            <option value="code">Code</option>
            <option value="conversation">Conversation</option>
            <option value="decision">Decision</option>
            <option value="pattern">Pattern</option>
          </select>
          <Button onClick={handleSearch} className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="border border-border rounded-lg bg-card">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'memories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-4 w-4" />
            Semantic Memories
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="h-4 w-4" />
            Knowledge Graph
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-4 w-4" />
            Vector Search
          </button>
        </div>

        {activeTab === 'memories' && (
          <div className="p-6 space-y-4">
            <div className="bg-background border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Semantic Memories</h3>
                  <p className="text-sm text-muted-foreground">
                    AI's learned patterns, decisions, and contextual knowledge
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <select
                    defaultValue="all"
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="code">Code</option>
                    <option value="conversation">Conversation</option>
                    <option value="decision">Decision</option>
                    <option value="pattern">Pattern</option>
                  </select>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : viewData.memories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No semantic memories found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {viewData.memories.slice(0, 20).map((memory) => (
                    <div key={memory.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full ${getMemoryTypeColor(memory.type)} mt-1 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {memory.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {(memory.relevanceScore * 100).toFixed(0)}% relevance
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(memory.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{memory.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Embedding: {memory.embedding.length} dimensions
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {viewData.memories.length > 20 && (
                    <div className="text-center py-4">
                      <Button variant="outline">
                        Load More ({viewData.memories.length - 20} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="p-6 space-y-4">
            <div className="bg-background border border-border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Knowledge Graph</h3>
                <p className="text-sm text-muted-foreground">
                  Visual representation of concepts and their relationships
                </p>
              </div>
              <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Network className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Knowledge Graph Visualization</p>
                  <p className="text-sm mt-2">
                    {viewData.knowledgeNodes.length} nodes, relationships to be visualized
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-6 space-y-4">
            <div className="bg-background border border-border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Vector Space Search Results</h3>
                <p className="text-sm text-muted-foreground">
                  Search results from semantic similarity matching
                </p>
              </div>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No search results</p>
                  <p className="text-sm mt-2">Enter a query above to search the vector database</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Score: {(result.score * 100).toFixed(1)}%
                            </Badge>
                            {(result.type || result.metadata?.type) && (
                              <Badge variant="secondary" className="text-xs">
                                {result.type || result.metadata?.type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-3">{result.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MemoryPage;