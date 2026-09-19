import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number; height?: string; className?: string }> = ({
  count = 3,
  height = 'h-16',
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full ${height} rounded-lg bg-slate-800/60 animate-pulse border border-slate-700/40`}
        />
      ))}
    </div>
  );
};
