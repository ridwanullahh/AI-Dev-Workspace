import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

interface GestureNavigationProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  currentIndex?: number
  totalItems?: number
  showIndicators?: boolean
  showNavigationButtons?: boolean
  className?: string
  disabled?: boolean
  threshold?: number
}

export function GestureNavigation({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  currentIndex = 0,
  totalItems = 0,
  showIndicators = true,
  showNavigationButtons = false,
  className,
  disabled = false,
  threshold = 50
}: GestureNavigationProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })
  const [showLeftHint, setShowLeftHint] = useState(false)
  const [showRightHint, setShowRightHint] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const lastTime = useRef(0)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return
    
    startPos.current = { x: clientX, y: clientY }
    lastPos.current = { x: clientX, y: clientY }
    lastTime.current = Date.now()
    setIsDragging(true)
    setDragOffset({ x: 0, y: 0 })
    setShowLeftHint(false)
    setShowRightHint(false)
  }, [disabled])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || disabled) return

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    const currentTime = Date.now()
    const deltaTime = currentTime - lastTime.current

    if (deltaTime > 0) {
      const deltaXVel = (clientX - lastPos.current.x) / deltaTime
      const deltaYVel = (clientY - lastPos.current.y) / deltaTime
      setVelocity({ x: deltaXVel, y: deltaYVel })
    }

    lastPos.current = { x: clientX, y: clientY }
    lastTime.current = currentTime

    setDragOffset({ x: deltaX, y: deltaY })

    // Show navigation hints
    if (deltaX > 30 && onSwipeRight) {
      setShowLeftHint(true)
    } else if (deltaX < -30 && onSwipeLeft) {
      setShowRightHint(true)
    } else {
      setShowLeftHint(false)
      setShowRightHint(false)
    }
  }, [isDragging, disabled, onSwipeLeft, onSwipeRight])

  const handleEnd = useCallback(() => {
    if (!isDragging || disabled) return

    const absX = Math.abs(dragOffset.x)
    const absY = Math.abs(dragOffset.y)
    const absVelX = Math.abs(velocity.x)
    const absVelY = Math.abs(velocity.y)

    // Check if swipe meets threshold or has sufficient velocity
    const shouldTriggerX = absX > threshold || absVelX > 1.5
    const shouldTriggerY = absY > threshold || absVelY > 1.5

    if (shouldTriggerX && absX > absY) {
      if (dragOffset.x > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (dragOffset.x < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    } else if (shouldTriggerY && absY > absX) {
      if (dragOffset.y > 0 && onSwipeDown) {
        onSwipeDown()
      } else if (dragOffset.y < 0 && onSwipeUp) {
        onSwipeUp()
      }
    }

    // Reset position
    setDragOffset({ x: 0, y: 0 })
    setIsDragging(false)
    setVelocity({ x: 0, y: 0 })
    setShowLeftHint(false)
    setShowRightHint(false)
  }, [isDragging, disabled, dragOffset, velocity, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
    e.preventDefault()
  }, [handleStart])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    if (!disabled) {
      container.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, disabled])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'ArrowLeft':
          if (onSwipeRight) onSwipeRight()
          break
        case 'ArrowRight':
          if (onSwipeLeft) onSwipeLeft()
          break
        case 'ArrowUp':
          if (onSwipeDown) onSwipeDown()
          break
        case 'ArrowDown':
          if (onSwipeUp) onSwipeUp()
          break
        case 'Home':
          // Navigate to first item
          if (currentIndex !== 0 && onSwipeRight) {
            onSwipeRight()
          }
          break
        case 'End':
          // Navigate to last item
          if (currentIndex !== totalItems - 1 && onSwipeLeft) {
            onSwipeLeft()
          }
          break
      }
    }

    if (!disabled) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [disabled, currentIndex, totalItems, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`
  const scale = isDragging ? 0.95 : 1

  return (
    <div className={cn("relative", className)}>
      {/* Navigation Hints */}
      {showLeftHint && (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Previous</span>
          </div>
        </div>
      )}

      {showRightHint && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2">
            <span className="text-sm">Next</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        ref={containerRef}
        className={cn(
          "relative touch-none select-none transition-transform duration-200 ease-out",
          isDragging && "cursor-grabbing",
          !isDragging && !disabled && "cursor-grab",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{
          transform: `${transform} scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>

      {/* Navigation Buttons */}
      {showNavigationButtons && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
          {onSwipeRight && (
            <button
              onClick={onSwipeRight}
              disabled={disabled || currentIndex === 0}
              className="pointer-events-auto ml-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          
          {onSwipeLeft && (
            <button
              onClick={onSwipeLeft}
              disabled={disabled || currentIndex === totalItems - 1}
              className="pointer-events-auto mr-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Page Indicators */}
      {showIndicators && totalItems > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {Array.from({ length: totalItems }, (_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex ? "bg-white" : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Home Button */}
      {showNavigationButtons && (
        <button
          onClick={() => {
            // Navigate to first item
            if (currentIndex !== 0 && onSwipeRight) {
              onSwipeRight()
            }
          }}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Example usage component
export function GestureCarousel({ 
  items, 
  currentIndex, 
  onIndexChange 
}: {
  items: React.ReactNode[]
  currentIndex: number
  onIndexChange: (index: number) => void
}) {
  const handleSwipeLeft = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1)
    }
  }

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    }
  }

  return (
    <GestureNavigation
      currentIndex={currentIndex}
      totalItems={items.length}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      showIndicators={true}
      showNavigationButtons={true}
      className="h-96 bg-black rounded-lg overflow-hidden"
    >
      {items[currentIndex]}
    </GestureNavigation>
  )
}