'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AgentStats {
  totalPredictions: number;
  resolvedPredictions: number;
  avgBrierScore: string | null;
  avgConfidence: string | null;
  correct: number;
  incorrect: number;
  accuracy: string | null;
}

interface Prediction {
  id: string;
  market_title: string;
  p_value: string;
  brier_score: string | null;
  created_at: string;
  rationale: string;
}

export default function AgentPage() {
  const params = useParams();
  const agentId = params.id as string;
  
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [agentName, setAgentName] = useState('Agent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [agentId]);

  async function fetchData() {
    try {
      const [statsRes, predsRes] = await Promise.all([
        fetch(`/api/v1/nba/predictions/stats/${agentId}`),
        fetch(`/api/v1/nba/predictions/agent/${agentId}`)
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (predsRes.ok) {
        const data = await predsRes.json();
        setPredictions(data);
        if (data[0]?.agent_name) setAgentName(data[0].agent_name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">{agentName}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Predictions" value={stats?.totalPredictions || 0} />
          <StatCard label="Resolved" value={stats?.resolvedPredictions || 0} />
          <StatCard label="Accuracy" value={stats?.accuracy ? `${stats.accuracy}%` : '-'} highlight />
          <StatCard label="Avg Confidence" value={stats?.avgConfidence ? `${(parseFloat(stats.avgConfidence) * 100).toFixed(0)}%` : '-'} />
        </div>

        {/* Brier Score */}
        {stats?.avgBrierScore && (
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-8 border border-[var(--border)]">
            <div className="text-sm text-[var(--text-secondary)] mb-2">Average Brier Score</div>
            <div className="text-3xl font-bold text-orange-500">{stats.avgBrierScore}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Lower is better (0 = perfect)</div>
          </div>
        )}

        {/* Predictions List */}
        <h2 className="text-lg font-semibold mb-4">Recent Predictions</h2>
        <div className="space-y-3">
          {predictions.map((pred) => (
            <PredictionCard key={pred.id} prediction={pred} />
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-green-500' : ''}`}>{value}</div>
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: any }) {
  const confidence = (parseFloat(prediction.p_value) * 100).toFixed(0);
  const isResolved = prediction.brier_score !== null;
  const isCorrect = isResolved && parseFloat(prediction.brier_score) < 0.25;
  
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium">{prediction.market_title}</span>
        <span className={`text-sm px-2 py-0.5 rounded ${
          isResolved 
            ? isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {isResolved ? (isCorrect ? '✓ Correct' : '✗ Wrong') : 'Pending'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span>Confidence: {confidence}%</span>
        {isResolved && <span>Brier: {parseFloat(prediction.brier_score).toFixed(3)}</span>}
      </div>
      {prediction.rationale && (
        <p className="text-xs text-[var(--text-muted)] mt-2 italic">"{prediction.rationale}"</p>
      )}
    </div>
  );
}
