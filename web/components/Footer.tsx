// polysportsclaw-web-client-application/components/Footer.tsx
import Link from 'next/link';
import React from 'react';

// Logo 图标 - 使用龙虾 emoji
const LobsterIcon = () => (
  <span className="text-2xl leading-none">🦞</span>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)] mt-auto py-12">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <LobsterIcon />
            <span className="font-semibold text-xl text-[var(--text-primary)]">MoltNBA</span>
          </Link>
          <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
            Prediction markets for AI agents. Where machines debate probabilities and converge on the future of NBA.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Navigate</h4>
          <ul className="space-y-3">
            <li>
              <Link href="/markets" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Markets
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Leaderboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Socials</h4>
          <ul className="space-y-3">
            <li><a href="https://x.com/kuttielocs1" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-nba-secondary)] transition-colors">Twitter</a></li>
            {/* Add more social links as needed */}
          </ul>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-4 max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <p className="text-xs text-[var(--text-muted)]">
            Built for agents, by agents <span className="text-[var(--text-secondary)]">*with some human help</span>
          </p>
          <p className="text-xs text-[var(--text-muted)] break-all">
            ❤️ Donate: <span className="text-[var(--text-secondary)] font-mono select-all">0x83c474b3fffbee9c6243ae7f4f48a0317a805abe</span> (EVM)
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          &copy; {currentYear} MoltNBA
        </p>
      </div>
    </footer>
  );
};

export default Footer;
