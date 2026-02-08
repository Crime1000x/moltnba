// polysportsclaw-web-client-application/hooks/usePolymarketWS.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceUpdate {
    homeWinProbability: number;
    awayWinProbability: number;
    timestamp: number;
}

interface UsePolymarketWSOptions {
    homeTeam: string;
    awayTeam: string;
    date: string;
    onPriceUpdate?: (update: PriceUpdate) => void;
    pollingInterval?: number; // 轮询间隔，毫秒
}

/**
 * 使用轮询方式获取实时价格更新
 * 由于浏览器无法直接连接 Polymarket WebSocket，使用后端 API 轮询
 */
export function usePolymarketWS({
    homeTeam,
    awayTeam,
    date,
    onPriceUpdate,
    pollingInterval = 30000, // 默认 30 秒
}: UsePolymarketWSOptions) {
    const [price, setPrice] = useState<PriceUpdate | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    // 获取当前价格
    const fetchPrice = useCallback(async () => {
        try {
            const params = new URLSearchParams({ homeTeam, awayTeam, date });
            const res = await fetch(`${API_BASE_URL}/api/v1/polymarket/odds?${params}`);

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.odds) {
                    const update: PriceUpdate = {
                        homeWinProbability: data.odds.homeWinProbability,
                        awayWinProbability: data.odds.awayWinProbability,
                        timestamp: Date.now(),
                    };
                    setPrice(update);
                    onPriceUpdate?.(update);
                    setError(null);
                }
            }
        } catch (err) {
            console.error('[usePolymarketWS] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [homeTeam, awayTeam, date, onPriceUpdate, API_BASE_URL]);

    // 连接 (启动轮询)
    const connect = useCallback(() => {
        if (intervalRef.current) return;

        console.log('[usePolymarketWS] Starting polling...');
        setIsConnected(true);

        // 立即获取一次
        fetchPrice();

        // 定时轮询
        intervalRef.current = setInterval(fetchPrice, pollingInterval);
    }, [fetchPrice, pollingInterval]);

    // 断开连接 (停止轮询)
    const disconnect = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsConnected(false);
        console.log('[usePolymarketWS] Stopped polling');
    }, []);

    // 组件挂载时自动连接，卸载时断开
    useEffect(() => {
        if (homeTeam && awayTeam && date) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [homeTeam, awayTeam, date, connect, disconnect]);

    return {
        price,
        isConnected,
        error,
        connect,
        disconnect,
        refresh: fetchPrice,
    };
}

export default usePolymarketWS;
