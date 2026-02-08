// polysportsclaw-web-client-application/components/ErrorCard.tsx
import React from 'react';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  title = 'Error Loading Data',
}) => {
  return (
    <div className="card text-center py-12 bg-[var(--bg-secondary)] border border-[var(--accent-nba-danger)] text-[var(--accent-nba-danger)] rounded-lg p-6">
      <h3 className="font-bold text-xl mb-4">{title}</h3>
      <p className="mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn bg-[var(--accent-nba-primary)] text-white mt-4 px-6 py-2 rounded-lg hover:bg-[var(--accent-nba-primary)]/90 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorCard;
