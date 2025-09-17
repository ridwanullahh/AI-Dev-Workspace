import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface SwipeableTaskItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
  onDelete?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
}

export function SwipeableTaskItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  onDelete,
  onArchive,
  onStar,
}: SwipeableTaskItemProps) {
  const [dragDistance, setDragDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setDragDistance(Math.max(-100, Math.min(100, diff)));
  };

  const handleEnd = () => {
    if (!isDragging) return;

    if (Math.abs(dragDistance) > 50) {
      if (dragDistance > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (dragDistance < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setDragDistance(0);
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  return (
    <div
      ref={itemRef}
      className={cn('relative overflow-hidden touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Action */}
      {leftAction && dragDistance < 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-red-500 text-white px-4"
          style={{ width: Math.abs(dragDistance) }}
        >
          {leftAction}
        </div>
      )}

      {/* Right Action */}
      {rightAction && dragDistance > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-green-500 text-white px-4"
          style={{ width: dragDistance }}
        >
          {rightAction}
        </div>
      )}

      {/* Main Content */}
      <div
        className="bg-background transition-transform duration-200"
        style={{
          transform: `translateX(${dragDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface SwipeableListProps {
  children: React.ReactNode;
  className?: string;
}

export function SwipeableList({ children, className }: SwipeableListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}