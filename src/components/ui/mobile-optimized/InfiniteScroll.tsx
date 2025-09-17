import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface InfiniteScrollProps {
  children: React.ReactNode;
  loadMore: () => Promise<void> | void;
  hasMore: boolean;
  loading?: boolean;
  threshold?: number;
  className?: string;
}

export function InfiniteScroll({
  children,
  loadMore,
  hasMore,
  loading = false,
  threshold = 100,
  className,
}: InfiniteScrollProps) {
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasMore || loading) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold && !isLoading) {
        setIsLoading(true);
        Promise.resolve(loadMore()).finally(() => setIsLoading(false));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadMore, threshold, isLoading]);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      style={{ maxHeight: '100%' }}
    >
      {children}
      {isLoading && (
        <div className="flex justify-center p-4">
          <LoadingSpinner size="md" />
        </div>
      )}
    </div>
  );
}