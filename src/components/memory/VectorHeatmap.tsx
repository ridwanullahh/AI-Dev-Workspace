import React, { useEffect, useRef, useState } from 'react'
import { enhancedVectorDatabase } from '@/services/enhancedVectorDatabase'
import { VectorSearchResult } from '@/services/types'
import { Flame, Thermometer } from 'lucide-react'

interface HeatmapData {
  vectors: number[][]
  labels: string[]
  similarities: number[][]
}

interface VectorHeatmapProps {
  query?: string
  results?: VectorSearchResult[]
  width?: number
  height?: number
  onCellClick?: (x: number, y: number, similarity: number) => void
}

export function VectorHeatmap({
  query,
  results = [],
  width = 600,
  height = 400,
  onCellClick
}: VectorHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number, value: number} | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query) {
      generateHeatmap(query)
    } else if (results.length > 0) {
      generateHeatmapFromResults(results)
    }
  }, [query, results])

  useEffect(() => {
    drawHeatmap()
  }, [heatmapData, hoveredCell])

  const generateHeatmap = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // Get search results to build vectors
      const searchResults = await enhancedVectorDatabase.search(searchQuery, { limit: 20 })

      // Generate similarity matrix
      const vectors: number[][] = []
      const labels: string[] = []

      for (const result of searchResults) {
        vectors.push(result.metadata.embedding || [])
        labels.push(result.content.substring(0, 50) + '...')
      }

      const similarities: number[][] = []
      for (let i = 0; i < vectors.length; i++) {
        similarities[i] = []
        for (let j = 0; j < vectors.length; j++) {
          if (i === j) {
            similarities[i][j] = 1.0
          } else {
            similarities[i][j] = cosineSimilarity(vectors[i], vectors[j])
          }
        }
      }

      setHeatmapData({ vectors, labels, similarities })
    } catch (error) {
      console.error('Failed to generate heatmap:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateHeatmapFromResults = (searchResults: VectorSearchResult[]) => {
    const vectors: number[][] = []
    const labels: string[] = []

    for (const result of searchResults.slice(0, 15)) {
      vectors.push(result.metadata.embedding || [])
      labels.push(result.content.substring(0, 30) + '...')
    }

    const similarities: number[][] = []
    for (let i = 0; i < vectors.length; i++) {
      similarities[i] = []
      for (let j = 0; j < vectors.length; j++) {
        if (i === j) {
          similarities[i][j] = 1.0
        } else {
          similarities[i][j] = cosineSimilarity(vectors[i], vectors[j])
        }
      }
    }

    setHeatmapData({ vectors, labels, similarities })
  }

  const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  const drawHeatmap = () => {
    const canvas = canvasRef.current
    if (!canvas || !heatmapData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { similarities, labels } = heatmapData
    const cellSize = Math.min(30, Math.floor(width / labels.length))
    const actualWidth = cellSize * labels.length
    const actualHeight = cellSize * labels.length

    // Set canvas size
    canvas.width = actualWidth
    canvas.height = actualHeight + 100 // Extra space for labels

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw cells
    for (let i = 0; i < similarities.length; i++) {
      for (let j = 0; j < similarities[i].length; j++) {
        const value = similarities[i][j]
        const x = j * cellSize
        const y = i * cellSize

        // Color based on similarity (red for high, blue for low)
        const intensity = Math.floor(value * 255)
        ctx.fillStyle = `rgb(${255 - intensity}, ${128}, ${intensity})`

        ctx.fillRect(x, y, cellSize, cellSize)

        // Border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }

    // Draw labels
    ctx.fillStyle = '#374151'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'

    // Y-axis labels (rotated)
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]
      const x = -5
      const y = i * cellSize + cellSize / 2 + 5

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }

    // X-axis labels
    ctx.textAlign = 'center'
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]
      const x = i * cellSize + cellSize / 2
      const y = actualHeight + 15

      ctx.fillText(label, x, y)
    }
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !heatmapData) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    const cellSize = Math.min(30, Math.floor(width / heatmapData.labels.length))
    const col = Math.floor(clickX / cellSize)
    const row = Math.floor(clickY / cellSize)

    if (row >= 0 && row < heatmapData.similarities.length &&
        col >= 0 && col < heatmapData.similarities[row].length) {
      const value = heatmapData.similarities[row][col]
      onCellClick?.(row, col, value)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !heatmapData) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const cellSize = Math.min(30, Math.floor(width / heatmapData.labels.length))
    const col = Math.floor(mouseX / cellSize)
    const row = Math.floor(mouseY / cellSize)

    if (row >= 0 && row < heatmapData.similarities.length &&
        col >= 0 && col < heatmapData.similarities[row].length) {
      const value = heatmapData.similarities[row][col]
      setHoveredCell({ x: col, y: row, value })
    } else {
      setHoveredCell(null)
    }
  }

  const getColorLegend = () => {
    const colors = []
    for (let i = 0; i <= 10; i++) {
      const intensity = i / 10
      colors.push({
        value: intensity,
        color: `rgb(${Math.floor((1 - intensity) * 255)}, 128, ${Math.floor(intensity * 255)})`
      })
    }
    return colors
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Generating heatmap...</span>
      </div>
    )
  }

  if (!heatmapData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Flame className="h-8 w-8 mr-2" />
        <span>No data to visualize</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredCell(null)}
        className="border border-border rounded-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {hoveredCell && (
        <div className="absolute top-2 left-2 bg-background border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            <span className="text-sm font-medium">
              Similarity: {(hoveredCell.value * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Row {hoveredCell.y}, Column {hoveredCell.x}
          </p>
        </div>
      )}

      {/* Color Legend */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          {getColorLegend().map((item, index) => (
            <div
              key={index}
              className="w-4 h-4 border border-border"
              style={{ backgroundColor: item.color }}
              title={`Similarity: ${(item.value * 100).toFixed(0)}%`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Low</span>
          <Flame className="h-3 w-3" />
          <span>High Similarity</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        <p>Click cells to explore vector similarities between {heatmapData.labels.length} items</p>
      </div>
    </div>
  )
}