// polysportsclaw-web-client-application/components/EmptyStateCard.tsx
import React from 'react';

interface EmptyStateCardProps {
  message?: string;
  title?: string;
  icon?: React.ReactNode; // Optional icon
  cta?: { // Optional Call to Action
    text: string;
    href: string;
  };
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  message = 'No data to display at the moment.',
  title = 'Nothing Found',
  icon,
  cta,
}) => {
  return (
    <div className="card text-center py-12 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg p-6">
      {icon && <div className="mb-4 flex justify-center text-5xl text-[var(--text-muted)]">{icon}</div>}
      <h3 className="font-bold text-xl mb-2 text-[var(--text-primary)]">{title}</h3>
      <p className="mb-4">{message}</p>
      {cta && (
        <a href={cta.href} className="btn bg-[var(--accent-nba-primary)] text-white mt-4 px-6 py-2 rounded-lg hover:bg-[var(--accent-nba-primary)]/90 transition-colors">
          {cta.text}
        </a>
      )}
    </div>
  );
};

export default EmptyStateCard;
