import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // Percentage heights [30, 60, 90]
  initialSnapPoint?: number;
  allowDrag?: boolean;
  backdrop?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [30, 60, 90],
  initialSnapPoint = 0,
  allowDrag = true,
  backdrop = true,
  className = ''
}) => {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const currentHeight = snapPoints[currentSnapPoint];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleStart = (clientY: number) => {
    if (!allowDrag) return;
    setIsDragging(true);
    setStartY(clientY);
    setCurrentY(clientY);
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || !allowDrag) return;
    setCurrentY(clientY);
  };

  const handleEnd = () => {
    if (!isDragging || !allowDrag) return;
    
    const deltaY = currentY - startY;
    const threshold = 50; // Minimum drag distance to trigger snap
    
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // Dragging down - go to smaller snap point or close
        if (currentSnapPoint > 0) {
          setCurrentSnapPoint(currentSnapPoint - 1);
        } else {
          onClose();
        }
      } else {
        // Dragging up - go to larger snap point
        if (currentSnapPoint < snapPoints.length - 1) {
          setCurrentSnapPoint(currentSnapPoint + 1);
        }
      }
    }
    
    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const getTransform = () => {
    if (!isDragging) return 0;
    const deltaY = Math.max(0, currentY - startY); // Only allow downward drag
    return deltaY;
  };

  if (!isOpen) return null;

  const bottomSheetContent = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      {backdrop && (
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          relative bg-white dark:bg-gray-900 
          rounded-t-xl shadow-2xl
          flex flex-col
          transition-all duration-300 ease-out
          ${isDragging ? 'transition-none' : ''}
          ${className}
        `}
        style={{
          height: `${currentHeight}vh`,
          transform: `translateY(${getTransform()}px)`,
          maxHeight: '90vh'
        }}
      >
        {/* Drag Handle */}
        <div
          ref={handleRef}
          className="flex-shrink-0 p-4 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
        </div>

        {/* Header */}
        {(title || onClose) && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 pb-4 border-b dark:border-gray-700">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* Snap Point Indicators */}
        {snapPoints.length > 1 && (
          <div className="flex-shrink-0 flex justify-center space-x-2 p-2">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSnapPoint(index)}
                className={`
                  w-2 h-2 rounded-full transition-colors
                  ${index === currentSnapPoint 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(bottomSheetContent, document.body);
};