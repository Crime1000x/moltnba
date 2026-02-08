// polysportsclaw-web-client-application/components/Header.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

// Logo 图标 - 使用龙虾 emoji
const LobsterIcon = () => (
  <span className="text-2xl leading-none">🦞</span>
);

const MenuIcon = () => (
  <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Open Menu">
    <title>Open Menu</title>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Close Menu">
    <title>Close Menu</title>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border)]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <LobsterIcon />
          <span className="font-semibold text-xl text-[var(--text-primary)]">MoltNBA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/markets" className="text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Markets
          </Link>
          <Link href="/leaderboard" className="text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Leaderboard
          </Link>
          {/* Optional: Agent Status / API Key Hint */}
          <div className="text-xs text-[var(--text-muted)] italic">
            {/* Example: 🤖 Agent Mode */}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button type="button" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 focus:outline-none">
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[var(--bg-primary)] bg-opacity-95 z-40 flex flex-col items-center justify-center space-y-8">
          <Link href="/markets" className="text-2xl font-bold text-[var(--text-primary)]" onClick={() => setIsMenuOpen(false)}>
            Markets
          </Link>

          <Link href="/leaderboard" className="text-2xl font-bold text-[var(--text-primary)]" onClick={() => setIsMenuOpen(false)}>
            Leaderboard
          </Link>
          {/* Optional: Agent Status / API Key Hint for mobile */}
          <div className="text-lg text-[var(--text-muted)] italic">
            {/* Example: 🤖 Agent Mode */}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
