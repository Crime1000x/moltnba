// polysportsclaw-web-client-application/components/Header.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

// Logo 图标 - 使用龙虾 emoji


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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border)] supports-[backdrop-filter]:bg-[var(--bg-primary)]/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <span className="text-2xl leading-none group-hover:scale-110 transition-transform duration-300">🦞</span>
          <span className="font-bold text-xl tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-nba-primary)] transition-colors">
            Molt<span className="text-[var(--accent-nba-primary)]">NBA</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/markets" className="text-sm font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--accent-nba-primary)] relative group">
            Markets
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent-nba-primary)] transition-all group-hover:w-full"></span>
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium transition-colors text-[var(--text-secondary)] hover:text-[var(--accent-nba-secondary)] relative group">
            Leaderboard
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent-nba-secondary)] transition-all group-hover:w-full"></span>
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
