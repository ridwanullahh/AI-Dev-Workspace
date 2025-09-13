import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  maxHeight?: string | number
  defaultHeight?: string | number
  className?: string
  showCloseButton?: boolean
  backdrop?: boolean
  disableBackdropClose?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '80vh',
  defaultHeight = '50vh',
  className,
  showCloseButton = true,
  backdrop = true,
  disableBackdropClose = false
}: BottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState(defaultHeight)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!sheetRef.current) return
    
    const touch = e.touches[0]
    const rect = sheetRef.current.getBoundingClientRect()
    
    // Only start drag if touching from the top area (drag handle)
    if (touch.clientY - rect.top <= 40) {
      setIsDragging(true)
      setStartY(touch.clientY)
      setCurrentY(touch.clientY)
      e.preventDefault()
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !sheetRef.current) return
    
    const touch = e.touches[0]
    const deltaY = touch.clientY - startY
    setCurrentY(touch.clientY)
    
    // Calculate new height based on drag
    const rect = sheetRef.current.getBoundingClientRect()
    const newHeight = Math.max(0, rect.height - deltaY)
    
    // Convert maxHeight to pixels for comparison
    const maxHeightPixels = typeof maxHeight === 'string' 
      ? parseInt(maxHeight) 
      : maxHeight
    
    if (newHeight <= maxHeightPixels) {
      setSheetHeight(newHeight)
    }
    
    e.preventDefault()
  }, [isDragging, startY, maxHeight])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    const deltaY = currentY - startY
    const threshold = 50 // Threshold to close the sheet
    
    // Close if dragged down significantly
    if (deltaY > threshold) {
      onClose()
    } else {
      // Reset to default height
      setSheetHeight(defaultHeight)
    }
  }, [isDragging, currentY, startY, onClose, defaultHeight])

  const handleBackdropClick = useCallback(() => {
    if (!disableBackdropClose) {
      onClose()
    }
  }, [onClose, disableBackdropClose])

  // Add touch event listeners
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !isOpen) return

    sheet.addEventListener('touchstart', handleTouchStart, { passive: false })
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false })
    sheet.addEventListener('touchend', handleTouchEnd)

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart)
      sheet.removeEventListener('touchmove', handleTouchMove)
      sheet.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Reset height when opening
  useEffect(() => {
    if (isOpen) {
      setSheetHeight(defaultHeight)
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, defaultHeight])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      {backdrop && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={handleBackdropClick}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        style={{
          height: sheetHeight,
          maxHeight: maxHeight
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            {title && (
              <h2 className="text-lg font-semibold">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors touch-target"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div 
          ref={contentRef}
          className="overflow-y-auto"
          style={{ maxHeight: `calc(${sheetHeight} - 120px)` }}
        >
          {children}
        </div>
      </div>
    </>
  )
}