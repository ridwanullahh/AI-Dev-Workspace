import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Trash2, Archive, Star, MoreVertical } from 'lucide-react'

interface SwipeableListItemProps {
  children: React.ReactNode
  leftActions?: Array<{
    icon: React.ReactNode
    label: string
    color: string
    onPress: () => void
  }>
  rightActions?: Array<{
    icon: React.ReactNode
    label: string
    color: string
    onPress: () => void
  }>
  className?: string
  disabled?: boolean
}

function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  className,
  disabled = false
}: SwipeableListItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState<'left' | 'right' | null>(null)
  
  const itemRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const startTime = useRef(0)

  const handleStart = (clientX: number) => {
    if (disabled) return
    
    startX.current = clientX
    currentX.current = clientX
    startTime.current = Date.now()
    setIsDragging(true)
    setShowActions(null)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return

    const deltaX = clientX - startX.current
    const maxSwipe = 120 // Maximum swipe distance
    
    // Calculate new translateX with resistance
    let newTranslateX = deltaX
    if (Math.abs(deltaX) > maxSwipe) {
      newTranslateX = Math.sign(deltaX) * (maxSwipe + (Math.abs(deltaX) - maxSwipe) * 0.3)
    }

    setTranslateX(newTranslateX)
    currentX.current = clientX
  }

  const handleEnd = () => {
    if (!isDragging || disabled) return

    const deltaTime = Date.now() - startTime.current
    const deltaX = currentX.current - startX.current
    const velocity = Math.abs(deltaX) / deltaTime

    const threshold = 80 // Minimum distance to show actions
    const velocityThreshold = 0.5 // Minimum velocity to trigger action

    if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
      if (deltaX > 0 && leftActions.length > 0) {
        setShowActions('left')
        setTranslateX(100) // Snap to show left actions
      } else if (deltaX < 0 && rightActions.length > 0) {
        setShowActions('right')
        setTranslateX(-100) // Snap to show right actions
      } else {
        resetPosition()
      }
    } else {
      resetPosition()
    }

    setIsDragging(false)
  }

  const resetPosition = () => {
    setTranslateX(0)
    setShowActions(null)
  }

  const handleActionPress = (action: () => void) => {
    action()
    resetPosition()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX)
    e.preventDefault()
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        resetPosition()
      }
    }

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActions])

  return (
    <div className="relative" ref={itemRef}>
      {/* Left Actions Background */}
      {leftActions.length > 0 && (
        <div 
          className={cn(
            "absolute inset-y-0 left-0 flex items-center bg-green-500 transition-opacity duration-200",
            showActions === 'left' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ 
            right: showActions === 'left' ? '100px' : '100%',
            zIndex: -1
          }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionPress(action.onPress)}
              className="flex flex-col items-center justify-center px-4 py-2 text-white"
            >
              <div className="mb-1">{action.icon}</div>
              <span className="text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions Background */}
      {rightActions.length > 0 && (
        <div 
          className={cn(
            "absolute inset-y-0 right-0 flex items-center bg-red-500 transition-opacity duration-200",
            showActions === 'right' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ 
            left: showActions === 'right' ? '100px' : '100%',
            zIndex: -1
          }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionPress(action.onPress)}
              className="flex flex-col items-center justify-center px-4 py-2 text-white"
            >
              <div className="mb-1">{action.icon}</div>
              <span className="text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "relative bg-background border-b border-border transition-transform duration-200",
          disabled && "opacity-50",
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  )
}

interface SwipeableListProps {
  children: React.ReactNode
  className?: string
}

export function SwipeableList({ children, className }: SwipeableListProps) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {children}
    </div>
  )
}

// Example usage components
export function SwipeableTaskItem({ 
  task, 
  onDelete, 
  onArchive, 
  onStar 
}: {
  task: { id: string; title: string; completed: boolean }
  onDelete: () => void
  onArchive: () => void
  onStar: () => void
}) {
  return (
    <SwipeableListItem
      leftActions={[
        {
          icon: <Archive className="h-5 w-5" />,
          label: 'Archive',
          color: 'bg-blue-500',
          onPress: onArchive
        },
        {
          icon: <Star className="h-5 w-5" />,
          label: 'Star',
          color: 'bg-yellow-500',
          onPress: onStar
        }
      ]}
      rightActions={[
        {
          icon: <Trash2 className="h-5 w-5" />,
          label: 'Delete',
          color: 'bg-red-500',
          onPress: onDelete
        }
      ]}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{task.title}</h3>
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </SwipeableListItem>
  )
}

export function SwipeableMessageItem({ 
  message, 
  onDelete, 
  onReply 
}: {
  message: { id: string; content: string; sender: string }
  onDelete: () => void
  onReply: () => void
}) {
  return (
    <SwipeableListItem
      leftActions={[
        {
          icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>,
          label: 'Reply',
          color: 'bg-green-500',
          onPress: onReply
        }
      ]}
      rightActions={[
        {
          icon: <Trash2 className="h-5 w-5" />,
          label: 'Delete',
          color: 'bg-red-500',
          onPress: onDelete
        }
      ]}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{message.sender}</p>
            <p className="text-sm">{message.content}</p>
          </div>
        </div>
      </div>
    </SwipeableListItem>
  )
}