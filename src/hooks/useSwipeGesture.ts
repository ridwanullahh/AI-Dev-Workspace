import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefaultTouchMove?: boolean;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchMove = false
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
      setIsSwiping(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Check if user is actually swiping (moved more than a few pixels)
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        setIsSwiping(true);
      }

      if (preventDefaultTouchMove && isSwiping) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine if swipe is horizontal or vertical
      if (absX > absY) {
        // Horizontal swipe
        if (absX > threshold) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (absY > threshold) {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
      setIsSwiping(false);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchMove });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, preventDefaultTouchMove, isSwiping]);

  return { isSwiping };
}

// Hook for pull-to-refresh gesture
export function usePullToRefresh(onRefresh: () => Promise<void>, threshold: number = 80) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start if scrolled to top
      if (window.scrollY === 0) {
        touchStartRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartRef.current;

      // Only allow pulling down
      if (distance > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(distance, threshold * 1.5));
        
        // Prevent default scroll if pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!touchStartRef.current || isRefreshing) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      touchStartRef.current = null;
      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, pullDistance, isRefreshing]);

  return { isPulling, pullDistance, isRefreshing };
}

// Hook for long press gesture
export function useLongPress(
  onLongPress: () => void,
  options: { delay?: number; shouldPreventDefault?: boolean } = {}
) {
  const { delay = 500, shouldPreventDefault = true } = options;
  const timerRef = useRef<NodeJS.Timeout>();
  const isPressed = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (shouldPreventDefault) {
        e.preventDefault();
      }

      isPressed.current = true;
      timerRef.current = setTimeout(() => {
        if (isPressed.current) {
          onLongPress();
        }
      }, delay);
    };

    const handleTouchEnd = () => {
      isPressed.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };

    const handleTouchMove = () => {
      isPressed.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onLongPress, delay, shouldPreventDefault]);
}
