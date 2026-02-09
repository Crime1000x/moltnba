// polysportsclaw-web-client-application/components/LoadingSkeleton.tsx
import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'table' | 'text'; // Type of skeleton: card, list item, table row, text lines
  count?: number; // Number of items to display for list/table
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card', count = 1 }) => {
  const renderCardSkeleton = () => (
    <div className="card bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-[var(--bg-tertiary)] rounded w-full mb-2"></div>
      <div className="h-3 bg-[var(--bg-tertiary)] rounded w-2/3"></div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`list-item-${i}`} className="flex items-center space-x-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-[var(--bg-tertiary)]"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4"></div>
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg animate-pulse">
        <thead>
          <tr className="text-[var(--text-muted)] uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left w-1/4"></th>
            <th className="py-3 px-6 text-left w-1/4"></th>
            <th className="py-3 px-6 text-left w-1/4"></th>
            <th className="py-3 px-6 text-left w-1/4"></th>
          </tr>
        </thead>
        <tbody className="text-[var(--text-primary)] text-sm font-light">
          {Array.from({ length: count }).map((_, i) => (
            <tr key={`table-row-${i}`} className="border-b border-[var(--border)]">
              <td className="py-4 px-6"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4"></div></td>
              <td className="py-4 px-6"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-full"></div></td>
              <td className="py-4 px-6"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2"></div></td>
              <td className="py-4 px-6"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTextSkeleton = () => (
    <div className="space-y-2 animate-pulse w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`text-${i}`}
          className="h-4 bg-[var(--bg-tertiary)] rounded"
          style={{ width: `${Math.max(60, Math.random() * 100)}%` }}
        ></div>
      ))}
    </div>
  );

  switch (type) {
    case 'list':
      return renderListSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'text':
      return renderTextSkeleton();
    case 'card':
    default:
      return renderCardSkeleton();
  }
};

export default LoadingSkeleton;
