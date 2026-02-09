// polysportsclaw-web-client-application/app/markets/page.tsx
import Link from 'next/link';
export const dynamic = 'force-dynamic';
import MarketListCard from '@/components/MarketListCard';
import ErrorCard from '@/components/ErrorCard';
import EmptyStateCard from '@/components/EmptyStateCard';
import React from 'react';

// Optional: Filter/Sort component (placeholder for now)
const MarketFilterSort = () => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <h3 className="text-xl font-semibold text-[var(--text-primary)]">All NBA Markets</h3>
      {/* Filters will go here */}
      <div className="flex gap-2">
        {/* Example Filter Buttons */}
        <button type="button" className="btn btn-outline text-sm px-4 py-2 rounded-full border-[var(--text-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-nba-primary)] hover:text-[var(--accent-nba-primary)]">
          Open
        </button>
        <button type="button" className="btn btn-outline text-sm px-4 py-2 rounded-full border-[var(--text-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-nba-primary)] hover:text-[var(--accent-nba-primary)]">
          Resolved
        </button>
        {/* Example Sort Dropdown */}
        <select className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-full px-4 py-2 text-sm">
          <option>Newest</option>
          <option>Closing Soon</option>
          <option>Most Predictions</option>
        </select>
      </div>
    </div>
  );
};


export default async function MarketsPage() {
  let nbaMarkets = [];
  let settledGames = [];
  let error = null;

  const API_BASE_URL = (typeof window === 'undefined')
    ? 'http://localhost:3001'
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001');

  try {
    // 获取未结束的比赛
    const res = await fetch(`${API_BASE_URL}/api/v1/public/nba-games`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch NBA markets: ${res.statusText}`);
    }
    nbaMarkets = await res.json();
  } catch (err: any) {
    console.error("Error fetching NBA markets:", err);
    error = err.message;
  }

  try {
    // 获取已结算的比赛
    const settledRes = await fetch(`${API_BASE_URL}/api/v1/settlement/games?limit=10`, {
      cache: 'no-store'
    });
    if (settledRes.ok) {
      const data = await settledRes.json();
      settledGames = data.games || [];
    }
  } catch (err) {
    console.error("Error fetching settled games:", err);
    // 已结算部分出错不影响主页面
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8 pt-20">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">NBA Prediction Markets</h1>

      {error ? (
        <ErrorCard
          title="Error Loading Markets"
          message={error}
        />
      ) : nbaMarkets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {nbaMarkets.map((market: any) => (
            <MarketListCard key={market.gameId} game={market} />
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No NBA Markets Found"
          message="There are no NBA games scheduled at the moment. Check back later!"
          icon={<span>🏀</span>}
        />
      )}

      {/* 已结算比赛部分 */}
      {settledGames.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <span>✅</span> Settled Games
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {settledGames.map((game: any) => (
              <div
                key={game.gameId}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 opacity-75"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[var(--text-muted)]">
                    {new Date(game.gameTime).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${game.outcome === 'home'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    {game.outcome === 'home' ? '🏠 Home Won' : '✈️ Away Won'}
                  </span>
                </div>
                <div className="text-[var(--text-primary)] font-medium">
                  {game.homeTeam} vs {game.awayTeam}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-2">
                  📊 {game.predictionCount} predictions · Avg Brier: {(game.avgBrierScore * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination placeholder */}
      <div className="flex justify-center mt-8">
        {/* Pagination buttons/component */}
      </div>
    </div>
  );
}
