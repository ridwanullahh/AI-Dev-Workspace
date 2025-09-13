import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  className?: string
  disabled?: boolean
  loading?: boolean
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  className,
  disabled = false,
  loading = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const isScrollTop = useRef(true)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return
    
    const touch = e.touches[0]
    startY.current = touch.clientY
    
    // Check if we're at the top of the container
    if (contentRef.current) {
      isScrollTop.current = contentRef.current.scrollTop === 0
    }
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isScrollTop.current) return
    
    const touch = e.touches[0]
    const deltaY = touch.clientY - startY.current
    
    if (deltaY > 0) {
      e.preventDefault()
      
      const distance = Math.min(deltaY * 0.5, maxPull) // Reduce pull speed
      setPullDistance(distance)
      setIsPulling(true)
      setCanRefresh(distance >= threshold)
    }
  }, [disabled, isRefreshing, maxPull, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return
    
    setIsPulling(false)
    
    if (canRefresh) {
      setIsRefreshing(true)
      setPullDistance(0)
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setCanRefresh(false)
      }
    } else {
      // Animate back to 0
      setPullDistance(0)
    }
  }, [isPulling, canRefresh, disabled, isRefreshing, onRefresh])

  // Handle scroll events to track scroll position
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      isScrollTop.current = contentRef.current.scrollTop === 0
    }
  }, [])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    
    if (content) {
      content.addEventListener('scroll', handleScroll)
    }

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      
      if (content) {
        content.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleScroll])

  // Calculate pull progress for animation
  const pullProgress = Math.min(pullDistance / threshold, 1)
  const rotation = pullProgress * 360

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        className
      )}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance - 60}px)`,
          opacity: isPulling || isRefreshing ? 1 : 0
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            canRefresh ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              (isRefreshing || loading) && "animate-spin"
            )}
            style={{
              transform: `rotate(${rotation}deg)`
            }}
          />
        </div>
      </div>

      {/* Pull Text */}
      <div
        className="absolute left-0 right-0 text-center pointer-events-none transition-all duration-200 text-sm"
        style={{
          transform: `translateY(${pullDistance - 30}px)`,
          opacity: isPulling || isRefreshing ? 1 : 0
        }}
      >
        {isRefreshing || loading ? (
          <span className="text-primary">Refreshing...</span>
        ) : canRefresh ? (
          <span className="text-primary">Release to refresh</span>
        ) : (
          <span className="text-muted-foreground">Pull to refresh</span>
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          "transition-transform duration-200",
          (isPulling || isRefreshing) && "transform translate-y-0"
        )}
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)'
        }}
      >
        {children}
      </div>
    </div>
  )
}