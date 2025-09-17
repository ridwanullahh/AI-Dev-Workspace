import React, { useEffect, useRef, useState } from 'react'
import { knowledgeGraphSystem } from '@/services/knowledgeGraph'
import { KnowledgeNode } from '@/services/types'

interface GraphNode {
  id: string
  x: number
  y: number
  node: KnowledgeNode
  connections: string[]
}

interface GraphLink {
  source: GraphNode
  target: GraphNode
  weight: number
}

interface KnowledgeGraphVisualizationProps {
  width?: number
  height?: number
  projectId?: string
  onNodeClick?: (node: KnowledgeNode) => void
}

export function KnowledgeGraphVisualization({
  width = 800,
  height = 600,
  projectId,
  onNodeClick
}: KnowledgeGraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadGraphData()
  }, [projectId])

  useEffect(() => {
    if (nodes.length > 0) {
      initializeLayout()
      drawGraph()
    }
  }, [nodes, links])

  const loadGraphData = async () => {
    try {
      setIsLoading(true)
      const graphData = await knowledgeGraphSystem.exportGraph(projectId)

      // Convert to visualization format
      const graphNodes: GraphNode[] = graphData.nodes.map((node, index) => ({
        id: node.id,
        x: Math.random() * width,
        y: Math.random() * height,
        node,
        connections: node.connections
      }))

      const graphLinks: GraphLink[] = []
      for (const node of graphNodes) {
        for (const connectionId of node.connections) {
          const targetNode = graphNodes.find(n => n.id === connectionId)
          if (targetNode) {
            const edge = knowledgeGraphSystem['edges'].get(`${node.id}_${connectionId}`) ||
                        knowledgeGraphSystem['edges'].get(`${connectionId}_${node.id}`)
            const weight = edge?.weight || 0.5
            graphLinks.push({
              source: node,
              target: targetNode,
              weight
            })
          }
        }
      }

      setNodes(graphNodes)
      setLinks(graphLinks)
    } catch (error) {
      console.error('Failed to load graph data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeLayout = () => {
    // Simple force-directed layout
    const iterations = 50
    const k = Math.sqrt(width * height / nodes.length) * 0.5

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate repulsive forces
      for (const node of nodes) {
        node.x += (Math.random() - 0.5) * 10
        node.y += (Math.random() - 0.5) * 10
      }

      // Apply attractive forces
      for (const link of links) {
        const dx = link.target.x - link.source.x
        const dy = link.target.y - link.source.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const force = (distance - k) / distance * 0.01

        link.source.x += dx * force
        link.source.y += dy * force
        link.target.x -= dx * force
        link.target.y -= dy * force
      }

      // Keep nodes within bounds
      for (const node of nodes) {
        node.x = Math.max(20, Math.min(width - 20, node.x))
        node.y = Math.max(20, Math.min(height - 20, node.y))
      }
    }
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw links
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (const link of links) {
      ctx.beginPath()
      ctx.moveTo(link.source.x, link.source.y)
      ctx.lineTo(link.target.x, link.target.y)
      ctx.stroke()
    }

    // Draw nodes
    for (const node of nodes) {
      const isSelected = selectedNode === node
      const radius = Math.max(5, Math.min(15, node.node.relevanceScore * 10))

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)

      // Color based on type
      switch (node.node.type) {
        case 'function':
          ctx.fillStyle = isSelected ? '#3b82f6' : '#60a5fa'
          break
        case 'concept':
          ctx.fillStyle = isSelected ? '#ef4444' : '#f87171'
          break
        case 'pattern':
          ctx.fillStyle = isSelected ? '#f59e0b' : '#fbbf24'
          break
        case 'file':
          ctx.fillStyle = isSelected ? '#10b981' : '#34d399'
          break
        default:
          ctx.fillStyle = isSelected ? '#6b7280' : '#9ca3af'
      }

      ctx.fill()

      // Draw label
      ctx.fillStyle = '#374151'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      const label = node.node.type.charAt(0).toUpperCase()
      ctx.fillText(label, node.x, node.y + 3)
    }
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Find clicked node
    const clickedNode = nodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= 15 // Click tolerance
    })

    if (clickedNode) {
      setSelectedNode(clickedNode)
      onNodeClick?.(clickedNode.node)
    } else {
      setSelectedNode(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading knowledge graph...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border border-border rounded-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {selectedNode && (
        <div className="absolute top-2 left-2 bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <h4 className="font-semibold text-sm">{selectedNode.node.type}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {selectedNode.node.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs">Relevance: {(selectedNode.node.relevanceScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span>Function</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span>Concept</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span>Pattern</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span>File</span>
        </div>
      </div>
    </div>
  )
}