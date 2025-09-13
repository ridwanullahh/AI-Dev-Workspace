import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface InfiniteScrollProps {
  children: React.ReactNode
  onLoadMore: () => Promise<void>
  hasMore: boolean
  loading?: boolean
  threshold?: number
  className?: string
  loader?: React.ReactNode
  endMessage?: React.ReactNode
  error?: string | null
  retry?: () => void
}

export function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  loading = false,
  threshold = 100,
  className,
  loader,
  endMessage,
  error,
  retry
}: InfiniteScrollProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || loading) return

    setIsLoading(true)
    setIsError(false)

    try {
      await onLoadMore()
    } catch (err) {
      console.error('Infinite scroll load failed:', err)
      setIsError(true)
      
      // Auto-retry after 3 seconds
      if (retry) {
        retryTimeoutRef.current = setTimeout(() => {
          retry()
        }, 3000)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, loading, onLoadMore, retry])

  // Set up intersection observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoading && !isError) {
          handleLoadMore()
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    )

    observerRef.current.observe(sentinelRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, isLoading, isError, threshold, handleLoadMore])

  // Clean up retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Update error state from props
  useEffect(() => {
    setIsError(!!error)
  }, [error])

  // Default loader component
  const defaultLoader = (
    <div className="flex justify-center items-center py-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
    </div>
  )

  // Default end message
  const defaultEndMessage = (
    <div className="text-center py-4 text-sm text-muted-foreground">
      You've reached the end
    </div>
  )

  // Default error message
  const defaultError = (
    <div className="text-center py-4">
      <p className="text-sm text-destructive mb-2">Failed to load more items</p>
      {retry && (
        <button
          onClick={retry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  )

  return (
    <div className={cn("relative", className)}>
      {/* Content */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Loading indicator */}
      {(isLoading || loading) && (
        <div className="py-4">
          {loader || defaultLoader}
        </div>
      )}

      {/* Error message */}
      {isError && !isLoading && !loading && (
        <div className="py-4">
          {error ? defaultError : defaultError}
        </div>
      )}

      {/* End message */}
      {!hasMore && !isLoading && !loading && !isError && (
        <div className="py-4">
          {endMessage || defaultEndMessage}
        </div>
      )}

      {/* Sentinel for intersection observer */}
      {hasMore && !isError && (
        <div
          ref={sentinelRef}
          className="h-1 w-full"
          style={{ visibility: 'hidden' }}
        />
      )}
    </div>
  )
}