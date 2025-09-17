import React, { useEffect, useRef, useState } from 'react'
import { ContextMemory } from '@/services/types'
import { Calendar, TrendingUp, Clock } from 'lucide-react'

interface TimelinePoint {
  memory: ContextMemory
  x: number
  y: number
}

interface MemoryTimelineProps {
  memories: ContextMemory[]
  width?: number
  height?: number
  onMemoryClick?: (memory: ContextMemory) => void
}

export function MemoryTimeline({
  memories,
  width = 800,
  height = 400,
  onMemoryClick
}: MemoryTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([])
  const [selectedMemory, setSelectedMemory] = useState<ContextMemory | null>(null)
  const [hoveredMemory, setHoveredMemory] = useState<ContextMemory | null>(null)

  useEffect(() => {
    processMemories()
  }, [memories])

  useEffect(() => {
    drawTimeline()
  }, [timelinePoints, selectedMemory, hoveredMemory])

  const processMemories = () => {
    if (memories.length === 0) return

    // Sort memories by timestamp
    const sortedMemories = [...memories].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const minTime = new Date(sortedMemories[0].timestamp).getTime()
    const maxTime = new Date(sortedMemories[sortedMemories.length - 1].timestamp).getTime()
    const timeRange = maxTime - minTime || 1

    const points: TimelinePoint[] = sortedMemories.map((memory, index) => {
      const timeProgress = (new Date(memory.timestamp).getTime() - minTime) / timeRange
      const x = 80 + (timeProgress * (width - 160)) // Leave margin for labels

      // Stack memories with same timestamp slightly offset
      const baseY = height / 2
      const offset = (index % 3 - 1) * 30 // Offset up to 3 layers
      const y = baseY + offset

      return {
        memory,
        x,
        y
      }
    })

    setTimelinePoints(points)
  }

  const drawTimeline = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw timeline axis
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(80, height / 2)
    ctx.lineTo(width - 80, height / 2)
    ctx.stroke()

    // Draw time markers
    ctx.fillStyle = '#6b7280'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'

    const timeLabels = ['1h', '6h', '1d', '1w', '1m']
    for (let i = 0; i < timeLabels.length; i++) {
      const x = 80 + (i / (timeLabels.length - 1)) * (width - 160)
      ctx.beginPath()
      ctx.moveTo(x, height / 2 - 5)
      ctx.lineTo(x, height / 2 + 5)
      ctx.stroke()
      ctx.fillText(timeLabels[i], x, height / 2 + 20)
    }

    // Draw memory points
    timelinePoints.forEach((point, index) => {
      const isSelected = selectedMemory?.id === point.memory.id
      const isHovered = hoveredMemory?.id === point.memory.id

      const radius = isSelected ? 8 : isHovered ? 6 : 4

      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)

      // Color based on type
      switch (point.memory.type) {
        case 'code':
          ctx.fillStyle = isSelected ? '#3b82f6' : '#60a5fa'
          break
        case 'conversation':
          ctx.fillStyle = isSelected ? '#10b981' : '#34d399'
          break
        case 'decision':
          ctx.fillStyle = isSelected ? '#f59e0b' : '#fbbf24'
          break
        case 'pattern':
          ctx.fillStyle = isSelected ? '#ef4444' : '#f87171'
          break
        default:
          ctx.fillStyle = '#9ca3af'
      }

      ctx.fill()

      // Draw connecting lines for recent memories
      if (index > 0) {
        const prevPoint = timelinePoints[index - 1]
        const timeDiff = new Date(point.memory.timestamp).getTime() -
                        new Date(prevPoint.memory.timestamp).getTime()

        if (timeDiff < 3600000) { // Within 1 hour
          ctx.strokeStyle = '#d1d5db'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(prevPoint.x, prevPoint.y)
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }
      }
    })
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    // Find clicked memory
    const clickedPoint = timelinePoints.find(point => {
      const dx = clickX - point.x
      const dy = clickY - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= 10 // Click tolerance
    })

    if (clickedPoint) {
      setSelectedMemory(clickedPoint.memory)
      onMemoryClick?.(clickedPoint.memory)
    } else {
      setSelectedMemory(null)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Find hovered memory
    const hoveredPoint = timelinePoints.find(point => {
      const dx = mouseX - point.x
      const dy = mouseY - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= 10
    })

    setHoveredMemory(hoveredPoint?.memory || null)
  }

  const formatTimestamp = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (memories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Calendar className="h-8 w-8 mr-2" />
        <span>No memories to display</span>
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
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredMemory(null)}
        className="border border-border rounded-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {(selectedMemory || hoveredMemory) && (
        <div className="absolute top-2 left-2 bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
          {(() => {
            const memory = selectedMemory || hoveredMemory!
            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {memory.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(memory.relevanceScore * 100).toFixed(0)}% relevance
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatTimestamp(memory.timestamp)}
                </p>
                <p className="text-sm line-clamp-3">
                  {memory.content}
                </p>
              </>
            )
          })()}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-xs">Code</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-xs">Conversation</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs">Decision</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-xs">Pattern</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>{memories.length} memories over time</span>
        </div>
      </div>
    </div>
  )
}

// Badge component for the tooltip
function Badge({ children, variant = "default", className = "" }: {
  children: React.ReactNode
  variant?: "default" | "secondary" | "outline"
  className?: string
}) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-background"
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}