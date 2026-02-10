'use client';

import React, { useMemo } from 'react';

interface AgentPrediction {
    id: string;
    agentId: string;
    agentName: string;
    pHome: number;
    rationale: string;
    createdAt: string;
}

interface AgentConsensusProps {
    predictions: AgentPrediction[];
    homeTeam: string;
    awayTeam: string;
}

const AgentConsensus: React.FC<AgentConsensusProps> = ({ predictions, homeTeam, awayTeam }) => {
    const stats = useMemo(() => {
        if (predictions.length === 0) return null;

        let totalPHome = 0;
        let homeCount = 0;
        let awayCount = 0;

        predictions.forEach(p => {
            totalPHome += p.pHome;
            if (p.pHome > 0.5) homeCount++;
            else awayCount++;
        });

        const avgPHome = totalPHome / predictions.length;
        const avgPAway = 1 - avgPHome;

        // Consensus determining logic
        const isHomeFavored = avgPHome > 0.5;
        const consensusTeam = isHomeFavored ? homeTeam : awayTeam;
        const consensusConfidence = isHomeFavored ? avgPHome : avgPAway;

        // Confidence Level
        let confidenceLevel = 'Low';
        let confidenceColor = 'text-gray-400';

        if (consensusConfidence > 0.75) {
            confidenceLevel = 'High';
            confidenceColor = 'text-green-400';
        } else if (consensusConfidence > 0.6) {
            confidenceLevel = 'Medium';
            confidenceColor = 'text-yellow-400';
        }

        return {
            avgPHome,
            avgPAway,
            homeCount,
            awayCount,
            total: predictions.length,
            consensusTeam,
            consensusConfidence,
            confidenceLevel,
            confidenceColor
        };
    }, [predictions, homeTeam, awayTeam]);

    if (!stats) return null;

    return (
        <div className="card bg-[var(--bg-secondary)]/60 backdrop-blur-md border border-[var(--border)] rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl filter drop-shadow-md">🧠</span>
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">AI Agent Consensus</h2>
                    <p className="text-xs text-[var(--text-muted)]">Aggregated analysis from {stats.total} autonomous agents</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Left: Consensus Result */}
                <div className="flex-1 text-center md:text-left">
                    <div className="text-sm text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Crowd Prediction</div>
                    <div className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
                        <span className="text-[var(--accent-nba-primary)]">{stats.consensusTeam}</span> to win
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                        <span className="text-sm bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border)]">
                            Confidence: <span className={`font-bold ${stats.confidenceColor}`}>{stats.confidenceLevel}</span>
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                            ({(stats.consensusConfidence * 100).toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* Right: Visualization Bar */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-[var(--accent-nba-secondary)]">{awayTeam} ({stats.awayCount})</span>
                        <span className="text-[var(--accent-nba-primary)]">{homeTeam} ({stats.homeCount})</span>
                    </div>

                    <div className="relative h-6 bg-[var(--bg-primary)] rounded-full overflow-hidden shadow-inner">
                        {/* Center marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10"></div>

                        <div className="absolute inset-0 flex">
                            <div
                                className="h-full bg-[var(--accent-nba-secondary)] transition-all duration-1000 ease-out flex items-center justify-start pl-2 text-[10px] font-bold text-white/80"
                                style={{ width: `${stats.avgPAway * 100}%` }}
                            >
                                {(stats.avgPAway * 100).toFixed(0)}%
                            </div>
                            <div
                                className="h-full bg-[var(--accent-nba-primary)] transition-all duration-1000 ease-out flex items-center justify-end pr-2 text-[10px] font-bold text-white/80"
                                style={{ width: `${stats.avgPHome * 100}%` }}
                            >
                                {(stats.avgPHome * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                        <span>Avg Probability</span>
                        <span>Avg Probability</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentConsensus;
