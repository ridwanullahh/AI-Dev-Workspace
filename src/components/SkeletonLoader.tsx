import React from 'react';

export const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);

export const SkeletonText = ({ width = 'w-full' }: { width?: string }) => (
  <div className={`h-4 bg-muted rounded animate-pulse ${width}`} />
);

export const SkeletonCircle = ({ size = 'h-12 w-12' }: { size?: string }) => (
  <div className={`${size} bg-muted rounded-full animate-pulse`} />
);

export const SkeletonProjectCard = () => (
  <div className="bg-card rounded-xl border border-border p-0 overflow-hidden">
    <SkeletonBox className="h-32 w-full" />
    <div className="p-4 space-y-3">
      <SkeletonText width="w-3/4" />
      <SkeletonText width="w-full" />
      <div className="flex gap-2">
        <SkeletonBox className="h-6 w-16" />
        <SkeletonBox className="h-6 w-16" />
      </div>
      <div className="flex gap-2 pt-2">
        <SkeletonBox className="h-9 flex-1" />
        <SkeletonBox className="h-9 w-9" />
      </div>
    </div>
  </div>
);

export const SkeletonChatMessage = () => (
  <div className="flex gap-3 p-4">
    <SkeletonCircle size="h-8 w-8" />
    <div className="flex-1 space-y-2">
      <SkeletonText width="w-24" />
      <SkeletonBox className="h-16 w-full" />
      <SkeletonText width="w-32" />
    </div>
  </div>
);

export const SkeletonListItem = () => (
  <div className="p-4 flex items-center gap-3">
    <SkeletonCircle size="h-10 w-10" />
    <div className="flex-1 space-y-2">
      <SkeletonText width="w-1/3" />
      <SkeletonText width="w-2/3" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-4">
        <SkeletonBox className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <SkeletonText width="w-1/4" />
          <SkeletonText width="w-1/2" />
        </div>
        <SkeletonBox className="h-8 w-20" />
      </div>
    ))}
  </div>
);

export const SkeletonProjectGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonProjectCard key={idx} />
    ))}
  </div>
);

export const SkeletonChatList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonChatMessage key={idx} />
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6 p-4">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonText width="w-48" />
      <SkeletonText width="w-64" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-6 space-y-3">
          <SkeletonText width="w-1/2" />
          <SkeletonBox className="h-12 w-full" />
          <SkeletonText width="w-1/3" />
        </div>
      ))}
    </div>

    {/* Chart Area */}
    <div className="bg-card rounded-lg border border-border p-6">
      <SkeletonText width="w-1/3" />
      <SkeletonBox className="h-64 w-full mt-4" />
    </div>
  </div>
);
