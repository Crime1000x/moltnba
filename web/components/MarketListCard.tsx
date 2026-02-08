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
      className={`card bg-[var(--bg-secondary)] ${borderStyle} rounded-lg p-4 transition-all hover:border-[var(--accent-nba-primary)] hover:scale-[1.02]`}
    >
      {/* 头部：状态徽章 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text-muted)]">🏀 NBA</span>
        <span className={`badge px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* 球队对阵 */}
      <div className="flex items-center justify-around my-4">
        {/* 主队 */}
        <div className="flex flex-col items-center">
          {game.homeTeam.logo ? (
            <img
              src={game.homeTeam.logo}
              alt={game.homeTeam.name}
              width={40}
              height={40}
              className="mb-1"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-full mb-1 flex items-center justify-center text-xs">🏀</div>
          )}
          <span className="text-sm font-semibold text-[var(--text-primary)]">{game.homeTeam.abbreviation}</span>
          {/* 比分（直播/结束时显示） */}
          {(isLive || isFinal) && (
            <span className="text-lg font-bold text-[var(--accent-nba-primary)]">
              {game.homeTeam.score || 0}
            </span>
          )}
        </div>

        {/* VS 或比分 */}
        <div className="flex flex-col items-center">
          {isLive && game.period && game.clock ? (
            <div className="text-center">
              <span className="text-xs text-red-400 block">Q{game.period}</span>
              <span className="text-sm text-[var(--text-muted)]">{game.clock}</span>
            </div>
          ) : (
            <span className="text-xl font-bold text-[var(--text-primary)]">VS</span>
          )}
        </div>

        {/* 客队 */}
        <div className="flex flex-col items-center">
          {game.awayTeam.logo ? (
            <img
              src={game.awayTeam.logo}
              alt={game.awayTeam.name}
              width={40}
              height={40}
              className="mb-1"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-full mb-1 flex items-center justify-center text-xs">🏀</div>
          )}
          <span className="text-sm font-semibold text-[var(--text-primary)]">{game.awayTeam.abbreviation}</span>
          {/* 比分 */}
          {(isLive || isFinal) && (
            <span className="text-lg font-bold text-[var(--accent-nba-secondary)]">
              {game.awayTeam.score || 0}
            </span>
          )}
        </div>
      </div>

      {/* Polymarket 赔率 */}
      {game.polymarketOdds && !isFinal ? (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[var(--accent-nba-primary)] rounded-full" />
            {game.homeTeam.abbreviation}: {(game.polymarketOdds.homeWinProbability * 100).toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            {game.awayTeam.abbreviation}: {(game.polymarketOdds.awayWinProbability * 100).toFixed(0)}%
            <span className="w-2 h-2 bg-[var(--accent-nba-secondary)] rounded-full" />
          </span>
        </div>
      ) : !isFinal ? (
        <p className="text-xs text-[var(--text-muted)] text-center mt-2">Click for details</p>
      ) : null}
    </Link>
  );
};

export default MarketListCard;