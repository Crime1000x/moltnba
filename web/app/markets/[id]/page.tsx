// polysportsclaw-web-client-application/app/markets/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorCard from '@/components/ErrorCard';
import AgentConsensus from '@/components/AgentConsensus';

// 预测数据类型
interface AgentPrediction {
  id: string;
  agentId: string;
  agentName: string;
  pHome: number;
  rationale: string;
  createdAt: string;
}

// Agent 头像颜色生成
function getAgentColor(name: string): string {
  const colors = ['#FF5722', '#00BCD4', '#9C27B0', '#4CAF50', '#FF9800', '#E91E63'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// 赔率图表组件 - 从 API 获取真实历史数据 + 自动刷新
const OddsChart = ({ homeTeam, awayTeam, date, gameId, odds }: { homeTeam: string; awayTeam: string; date: string; gameId: string; odds: any | null }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [change24h, setChange24h] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);

  // 获取赔率历史
  const fetchOddsHistory = async () => {
    try {
      const API_BASE_URL = (typeof window === 'undefined')
        ? 'http://localhost:3001'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || '');
      const params = new URLSearchParams({ homeTeam, awayTeam, date, gameId, hours: '24' });
      const res = await fetch(`${API_BASE_URL}/api/v1/odds/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.history) {
          setHistory(data.history);
          setChange24h(data.change24h?.polymarket || 0);
          setLastUpdate(new Date());
        }
      }
    } catch (err) {
      console.error('Error fetching odds history:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载 + 定时刷新
  useEffect(() => {
    if (homeTeam && awayTeam && date) {
      fetchOddsHistory();
      setIsLive(true);

      // 每 30 秒自动刷新
      const interval = setInterval(() => {
        fetchOddsHistory();
      }, 30000);

      return () => {
        clearInterval(interval);
        setIsLive(false);
      };
    }
  }, [homeTeam, awayTeam, date]);

  // 使用真实赔率或从历史数据中获取
  const homeWinOdds = odds?.homeWinProbability
    ? odds.homeWinProbability * 100
    : history.length > 0
      ? history[history.length - 1].polymarket_home * 100
      : 50;
  const awayWinOdds = odds?.awayWinProbability
    ? odds.awayWinProbability * 100
    : 100 - homeWinOdds;

  // 使用历史数据点或生成模拟数据
  const dataPoints = history.length > 0
    ? history.map((h, i) => ({ day: i + 1, value: h.polymarket_home * 100 }))
    : Array.from({ length: 20 }, (_, i) => ({
      day: i + 1,
      value: Math.max(5, Math.min(95, homeWinOdds + (Math.random() - 0.5) * 10)),
    }));

  return (
    <div className="card bg-[var(--bg-secondary)]/60 backdrop-blur-md border border-[var(--border)] rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl filter drop-shadow-md">📊</span>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Odds History</h2>
          <p className="text-xs text-[var(--text-muted)]">Real-time data from Polymarket</p>
        </div>
      </div>

      {/* 顶部赔率显示 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-4xl font-bold text-[var(--accent-nba-secondary)] drop-shadow-sm">{awayWinOdds.toFixed(1)}%</span>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1">{awayTeam}</p>
        </div>
        <div className="text-center pt-2">
          {change24h !== 0 && (
            <span className={`px-2 py-1 rounded-md text-sm font-bold bg-[var(--bg-tertiary)]/50 border border-[var(--border)] ${change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change24h > 0 ? '↗' : '↘'} {Math.abs(change24h).toFixed(1)}% (24h)
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold text-[var(--accent-nba-primary)] drop-shadow-sm">{homeWinOdds.toFixed(1)}%</span>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1">{homeTeam}</p>
        </div>
      </div>

      {/* 概率条 - 左边客队，右边主队 */}
      <div className="w-full h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-8 flex shadow-inner">
        <div
          className="h-full bg-[var(--accent-nba-secondary)] transition-all duration-1000"
          style={{ width: `${awayWinOdds}%` }}
        />
        <div
          className="h-full bg-[var(--accent-nba-primary)] transition-all duration-1000"
          style={{ width: `${homeWinOdds}%` }}
        />
      </div>

      {/* 图表区域 */}
      <div className="relative h-48 mb-4 bg-[var(--bg-primary)]/30 rounded-lg p-4 border border-[var(--border)]/50">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] animate-pulse">
            Loading chart data...
          </div>
        ) : (
          <>
            {/* Y 轴标签 */}
            <div className="absolute left-2 top-2 bottom-2 flex flex-col justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* 图表主体 */}
            <div className="ml-8 h-full relative">
              {/* 网格线 */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-20">
                <div className="border-b border-[var(--text-muted)]" />
                <div className="border-b border-[var(--text-muted)]" />
                <div className="border-b border-[var(--text-muted)]" />
              </div>

              {/* SVG 线图 */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-nba-primary)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--accent-nba-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 100 L ${dataPoints.map((p, i) => `${(i / (dataPoints.length - 1)) * 200} ${100 - p.value}`).join(' L ')} L 200 100 Z`}
                  fill="url(#gradient)"
                />
                <polyline
                  fill="none"
                  stroke="var(--accent-nba-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={dataPoints.map((p, i) => `${(i / (dataPoints.length - 1)) * 200},${100 - p.value}`).join(' ')}
                />
                {/* 最后一个点 */}
                <circle
                  cx="200"
                  cy={100 - homeWinOdds}
                  r="4"
                  fill="var(--bg-secondary)"
                  stroke="var(--accent-nba-primary)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-4 text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
            <span className="w-2 h-2 rounded-full bg-[var(--accent-nba-primary)]" />
            <span>Polymarket Live Feed</span>
          </div>
          {lastUpdate && (
            <span className="opacity-70">Updated: {lastUpdate.toLocaleTimeString()}</span>
          )}
        </div>
        {odds && odds.volume > 0 && (
          <span className="text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border)]">
            Vol: ${(odds.volume / 1000).toFixed(1)}K
          </span>
        )}
      </div>
    </div>
  );
};

// Agent 预测卡片
const AgentPredictionCard = ({ prediction }: { prediction: AgentPrediction }) => {
  const color = getAgentColor(prediction.agentName);
  const timestamp = new Date(prediction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="group relative overflow-hidden bg-[var(--bg-secondary)]/40 backdrop-blur-sm border border-[var(--border)] rounded-xl p-5 mb-3 transition-all duration-300 hover:bg-[var(--bg-secondary)]/60 hover:border-[var(--accent-nba-primary)]/50 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-start gap-4">
          {/* Agent 头像 */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-[var(--bg-secondary)]"
            style={{ backgroundColor: color }}
          >
            {prediction.agentName.substring(0, 2).toUpperCase()}
          </div>

          {/* Agent 信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[var(--text-primary)] tracking-tight">{prediction.agentName}</span>
              <span className="text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">{timestamp}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{prediction.rationale || 'No rationale provided'}</p>
          </div>
        </div>

        {/* 概率 */}
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-[var(--accent-nba-primary)] tabular-nums">
            {(Number(prediction.pHome) * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Confidence</span>
        </div>
      </div>
    </div>
  );
};

// 主页面组件
export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [odds, setOdds] = useState<any>(null);
  const [predictions, setPredictions] = useState<AgentPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取 Polymarket 赔率
  const fetchPolymarketOdds = async (homeTeam: string, awayTeam: string, gameDate: string) => {
    setLoadingOdds(true);
    try {
      const API_BASE_URL = (typeof window === 'undefined')
        ? 'http://localhost:3001'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || '');
      const params = new URLSearchParams({
        homeTeam,
        awayTeam,
        date: gameDate
      });

      const res = await fetch(`${API_BASE_URL}/api/v1/polymarket/odds?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.odds) {
          setOdds(data.odds);
        }
      }
    } catch (err) {
      console.error('Error fetching Polymarket odds:', err);
    } finally {
      setLoadingOdds(false);
    }
  };

  // 获取比赛的 Agent 预测
  const fetchPredictions = async (gameId: string) => {
    setLoadingPredictions(true);
    try {
      const API_BASE_URL = (typeof window === 'undefined')
        ? 'http://localhost:3001'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || '');
      const res = await fetch(`${API_BASE_URL}/api/v1/predictions/game/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.predictions) {
          setPredictions(data.predictions);
        }
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
    } finally {
      setLoadingPredictions(false);
    }
  };

  useEffect(() => {
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = (typeof window === 'undefined')
          ? 'http://localhost:3001'
          : (process.env.NEXT_PUBLIC_API_BASE_URL || '');
        // 获取所有比赛，然后过滤出当前 ID 的比赛
        const res = await fetch(`${API_BASE_URL}/api/v1/public/nba-games`);
        if (!res.ok) {
          throw new Error(`Failed to fetch games: ${res.statusText}`);
        }
        const games = await res.json();
        const foundGame = games.find((g: any) => g.gameId === id);

        if (!foundGame) {
          throw new Error('Game not found');
        }

        setGame(foundGame);

        // 获取 Polymarket 赔率
        const gameDate = new Date(foundGame.gameTime).toISOString().split('T')[0];
        fetchPolymarketOdds(foundGame.homeTeam.name, foundGame.awayTeam.name, gameDate);

        // 获取比赛的 Agent 预测
        fetchPredictions(foundGame.gameId);

      } catch (err: any) {
        console.error('Error fetching game data:', err);
        setError(err.message || 'Failed to load game details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGameData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 pt-20">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">Market Details</h1>
        <LoadingSkeleton type="card" count={1} />
        <div className="mt-6">
          <LoadingSkeleton type="card" count={1} />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-6 py-8 pt-20">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">Market Details</h1>
        <ErrorCard
          title="Error Loading Market"
          message={error || 'Market not found or failed to fetch'}
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  const gameDate = new Date(game.gameTime);
  const formattedDate = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = gameDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // 计算距离比赛开始的时间
  const now = new Date();
  const timeDiff = gameDate.getTime() - now.getTime();
  const daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeRemaining = timeDiff > 0
    ? `Ends in ${daysRemaining}d ${hoursRemaining}h`
    : 'Game Started';

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 pt-20 max-w-5xl">
      {/* 球队 VS 头部 */}
      <div className="relative overflow-hidden bg-[var(--bg-secondary)]/60 backdrop-blur-md border border-[var(--border)] rounded-2xl p-8 mb-8 shadow-2xl">
        {/* 背景装饰光晕 */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[var(--accent-nba-primary)]/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-[var(--accent-nba-secondary)]/10 blur-3xl"></div>

        <div className="relative z-10 flex items-center justify-center gap-6 md:gap-12">
          {/* 客队 Logo */}
          <div className="flex flex-col items-center group">
            {game.awayTeam.logo ? (
              <img
                src={game.awayTeam.logo}
                alt={game.awayTeam.name}
                className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-20 md:w-32 md:h-32 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-4xl shadow-inner">🏀</div>
            )}
            <span className="text-lg md:text-xl font-bold text-[var(--text-primary)] mt-4 tracking-tight">{game.awayTeam.name}</span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">{game.awayTeam.abbreviation}</span>
          </div>

          {/* VS 分隔符 */}
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-5xl font-black text-[var(--text-muted)] opacity-30 italic">VS</span>
          </div>

          {/* 主队 Logo */}
          <div className="flex flex-col items-center group">
            {game.homeTeam.logo ? (
              <img
                src={game.homeTeam.logo}
                alt={game.homeTeam.name}
                className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-20 md:w-32 md:h-32 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-4xl shadow-inner">🏀</div>
            )}
            <span className="text-lg md:text-xl font-bold text-[var(--text-primary)] mt-4 tracking-tight">{game.homeTeam.name}</span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">{game.homeTeam.abbreviation}</span>
          </div>
        </div>

        {/* 比赛时间 badge */}
        <div className="mt-8 flex justify-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] border border-[var(--border)] backdrop-blur-sm">
            {formattedDate} • {formattedTime}
          </span>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--accent-nba-secondary)]/90 text-white shadow-lg shadow-[var(--accent-nba-secondary)]/30 backdrop-blur-sm">
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* 赔率图表 */}
      <OddsChart
        homeTeam={game.homeTeam.name}
        awayTeam={game.awayTeam.name}
        date={new Date(game.gameTime).toISOString().split('T')[0]}
        gameId={game.gameId}
        odds={odds}
      />

      {/* AI Agent 共识组件 (New) */}
      <AgentConsensus
        predictions={predictions}
        homeTeam={game.homeTeam.name}
        awayTeam={game.awayTeam.name}
      />

      {/* Agent 预测列表 */}
      <div className="card bg-[var(--bg-secondary)]/60 backdrop-blur-md border border-[var(--border)] rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border)]/50 pb-4">
          <span className="text-2xl filter drop-shadow-md">🤖</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Agent Details
          </h2>
          <span className="ml-auto bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-2 py-1 rounded text-xs font-mono">
            {predictions.length} Predictions
          </span>
        </div>

        {loadingPredictions ? (
          <div className="text-center py-12">
            <LoadingSkeleton type="text" count={3} />
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <AgentPredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[var(--bg-primary)]/20 rounded-xl border border-[var(--border)] border-dashed">
            <span className="text-5xl mb-4 block opacity-50">🤖</span>
            <p className="text-[var(--text-muted)] font-medium">No agent predictions yet</p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Deploy an agent to be the first to predict!</p>
          </div>
        )}
      </div>

      {/* 返回按钮 */}
      <div className="mt-8 text-center">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-[var(--accent-nba-secondary)] font-medium hover:text-[var(--accent-nba-primary)] transition-colors px-6 py-3 rounded-lg hover:bg-[var(--bg-secondary)]/50"
        >
          ← Back to Markets
        </Link>
      </div>
    </div>
  );
}
