import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CardSwipeProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  className?: string
  disabled?: boolean
}

export function CardSwipe({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  className,
  disabled = false
}: CardSwipeProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const lastTime = useRef(0)

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return
    
    startPos.current = { x: clientX, y: clientY }
    lastPos.current = { x: clientX, y: clientY }
    lastTime.current = Date.now()
    setIsDragging(true)
    setPosition({ x: 0, y: 0 })
  }

  const handleMove = (clientX: number, clientY: number) => {
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

    setPosition({ x: deltaX, y: deltaY })
  }

  const handleEnd = () => {
    if (!isDragging || disabled) return

    const absX = Math.abs(position.x)
    const absY = Math.abs(position.y)
    const absVelX = Math.abs(velocity.x)
    const absVelY = Math.abs(velocity.y)

    // Check if swipe meets threshold or has sufficient velocity
    const shouldTriggerX = absX > threshold || absVelX > 2
    const shouldTriggerY = absY > threshold || absVelY > 2

    if (shouldTriggerX && absX > absY) {
      if (position.x > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (position.x < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    } else if (shouldTriggerY && absY > absX) {
      if (position.y > 0 && onSwipeDown) {
        onSwipeDown()
      } else if (position.y < 0 && onSwipeUp) {
        onSwipeUp()
      }
    }

    // Reset position
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
    setVelocity({ x: 0, y: 0 })
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging])

  const transform = `translate3d(${position.x}px, ${position.y}px, 0)`
  const rotation = position.x * 0.1 // Slight rotation for visual feedback

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative touch-none select-none transition-transform duration-200 ease-out",
        isDragging && "cursor-grabbing shadow-lg",
        !isDragging && "cursor-grab",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{
        transform: `${transform} rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}
      
      {/* Swipe indicators */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          {position.x > 20 && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                ✓
              </div>
            </div>
          )}
          {position.x < -20 && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white">
                ✕
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}