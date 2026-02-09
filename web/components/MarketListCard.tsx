// polysportsclaw-web-client-application/components/MarketListCard.tsx
'use client';

import Link from 'next/link';
import React from 'react';

interface MarketListCardProps {
  game: any;
}

const MarketListCard: React.FC<MarketListCardProps> = ({ game }) => {
  // 判断比赛状态
  const isLive = game.isLive || game.status === 'live' || game.status === 'in_progress';
  const isFinal = game.isFinal || game.status === 'final';
  const isScheduled = !isLive && !isFinal;

  // 格式化时间
  const gameDate = new Date(game.gameTime);
  const timeString = gameDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // 判断是否是今天
  const today = new Date();
  const isToday = gameDate.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = gameDate.toDateString() === tomorrow.toDateString();

  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // 状态徽章样式
  const getStatusBadge = () => {
    if (isLive) {
      return {
        text: game.statusText || '🔴 LIVE',
        className: 'bg-red-500 text-white animate-pulse'
      };
    }
    if (isFinal) {
      return {
        text: 'Final',
        className: 'bg-gray-500 text-white'
      };
    }
    return {
      text: `${dateLabel} ${timeString}`,
      className: 'bg-[var(--accent-nba-secondary)] text-white'
    };
  };

  const statusBadge = getStatusBadge();

  // 边框样式
  const borderStyle = isLive
    ? 'border-2 border-red-500'
    : isFinal
      ? 'border border-gray-500'
      : 'border border-[var(--border)]';

  return (
    <Link
      href={`/markets/${game.gameId}`}
      className={`group relative overflow-hidden bg-[var(--bg-secondary)]/60 backdrop-blur-md ${borderStyle} rounded-xl p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--accent-nba-primary)]/20 hover:border-[var(--accent-nba-primary)]/50`}
    >
      {/* 装饰性光晕背景 */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-[var(--accent-nba-primary)]/5 blur-3xl group-hover:bg-[var(--accent-nba-primary)]/10 transition-all duration-500"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-[var(--accent-nba-secondary)]/5 blur-3xl group-hover:bg-[var(--accent-nba-secondary)]/10 transition-all duration-500"></div>

      {/* 头部：状态徽章 */}
      <div className="relative flex items-center justify-between mb-4 z-10">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wider">🏆 NBA REGULAR SEASON</span>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusBadge.className.includes('bg-') ? 'border-transparent' : 'border-[var(--border-light)]'} ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* 球队对阵 */}
      <div className="relative flex items-center justify-between my-2 z-10">
        {/* 主队 */}
        <div className="flex flex-col items-center w-1/3">
          <div className="relative group-hover:scale-110 transition-transform duration-300">
            {game.homeTeam.logo ? (
              <img
                src={game.homeTeam.logo}
                alt={game.homeTeam.name}
                className="w-14 h-14 object-contain drop-shadow-lg"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-xl shadow-inner">🏀</div>
            )}
          </div>
          <span className="mt-3 text-lg font-bold text-[var(--text-primary)] tracking-tight">{game.homeTeam.abbreviation}</span>

          {(isLive || isFinal) && (
            <span className="text-2xl font-black text-[var(--text-primary)] mt-1">
              {game.homeTeam.score || 0}
            </span>
          )}
        </div>

        {/* VS / Info */}
        <div className="flex flex-col items-center justify-center w-1/3">
          {isLive && game.period ? (
            <div className="flex flex-col items-center animate-pulse">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Q{game.period}</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">{game.clock}</span>
            </div>
          ) : (
            <span className="text-xs font-black text-[var(--text-muted)] opacity-30 tracking-widest text-center">VS</span>
          )}
        </div>

        {/* 客队 */}
        <div className="flex flex-col items-center w-1/3">
          <div className="relative group-hover:scale-110 transition-transform duration-300">
            {game.awayTeam.logo ? (
              <img
                src={game.awayTeam.logo}
                alt={game.awayTeam.name}
                className="w-14 h-14 object-contain drop-shadow-lg"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-xl shadow-inner">🏀</div>
            )}
          </div>
          <span className="mt-3 text-lg font-bold text-[var(--text-primary)] tracking-tight">{game.awayTeam.abbreviation}</span>

          {(isLive || isFinal) && (
            <span className="text-2xl font-black text-[var(--text-primary)] mt-1">
              {game.awayTeam.score || 0}
            </span>
          )}
        </div>
      </div>

      {/* Polymarket 赔率 */}
      {game.polymarketOdds && !isFinal ? (
        <div className="relative z-10 mt-5 pt-3 border-t border-[var(--border)]/50">
          <div className="flex justify-between items-center text-xs font-medium text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-nba-primary)] shadow-[0_0_8px_var(--accent-nba-primary)]"></div>
              <span>{(game.polymarketOdds.homeWinProbability * 100).toFixed(0)}% Win</span>
            </div>
            <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Polymarket probability</span>
            <div className="flex items-center gap-2">
              <span>{(game.polymarketOdds.awayWinProbability * 100).toFixed(0)}% Win</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-nba-secondary)] shadow-[0_0_8px_var(--accent-nba-secondary)]"></div>
            </div>
          </div>

          {/* 概率条 */}
          <div className="mt-2 h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[var(--accent-nba-primary)]"
              style={{ width: `${game.polymarketOdds.homeWinProbability * 100}%` }}
            />
            <div
              className="h-full bg-[var(--accent-nba-secondary)]"
              style={{ width: `${game.polymarketOdds.awayWinProbability * 100}%` }}
            />
          </div>
        </div>
      ) : !isFinal ? (
        <div className="relative z-10 mt-5 pt-3 border-t border-[var(--border)]/50 text-center">
          <div className="py-1.5 px-3 rounded-lg bg-[var(--bg-tertiary)]/30 mx-auto w-fit group-hover:bg-[var(--accent-nba-primary)]/10 transition-colors duration-300">
            <span className="text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--accent-nba-primary)] transition-colors">
              View Matchup & Prediction &rarr;
            </span>
          </div>
        </div>
      ) : null}
    </Link>
  );
};

export default MarketListCard;