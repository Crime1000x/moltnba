// polysportsclaw-api/src/routes/odds_history.js (MySQL 版本)

const express = require('express');
const { getGameOdds } = require('../services/PolymarketService');
const OddsCollectorService = require('../services/OddsCollectorService');
const { healthCheck } = require('../config/database');

const router = express.Router();

/**
 * 从数据库历史记录格式化为 API 响应格式
 */
function formatHistoryFromDB(dbRecords) {
    return dbRecords.map(record => {
        // Handle both raw DB row (collected_at) and Service-formatted object (timestamp)
        const dateVal = record.timestamp || record.collected_at;
        const dateObj = new Date(dateVal);
        
        return {
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: dateObj.getTime(),
            date: dateObj.toISOString(),
            polymarket_home: record.polymarket_home !== undefined ? record.polymarket_home : (parseFloat(record.home_probability) || 0.5),
            polymarket_away: record.polymarket_away !== undefined ? record.polymarket_away : (parseFloat(record.away_probability) || 0.5),
            volume: record.volume !== undefined ? record.volume : (parseFloat(record.volume) || 0)
        };
    });
}

/**
 * 生成模拟的赔率历史数据 (作为回退方案)
 */
function generateMockOddsHistory(currentOdds, hours = 24) {
    const history = [];
    const now = Date.now();
    const interval = 30 * 60 * 1000; // 30分钟间隔
    const points = Math.min(hours * 2, 48);

    for (let i = points; i >= 0; i--) {
        const timestamp = now - i * interval;
        const date = new Date(timestamp);
        const volatility = 0.03;
        const drift = (Math.random() - 0.5) * volatility;

        let homeProb = currentOdds.homeWinProbability + drift * (i / points);
        homeProb = Math.max(0.05, Math.min(0.95, homeProb));

        history.push({
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp,
            date: date.toISOString(),
            polymarket_home: homeProb,
            polymarket_away: 1 - homeProb,
        });
    }

    if (history.length > 0) {
        const last = history[history.length - 1];
        last.polymarket_home = currentOdds.homeWinProbability;
        last.polymarket_away = currentOdds.awayWinProbability;
    }

    return history;
}

/**
 * @route GET /api/v1/odds/history
 * @desc 获取比赛的赔率历史数据
 * @query homeTeam - 主队名称
 * @query awayTeam - 客队名称  
 * @query date - 比赛日期 (YYYY-MM-DD)
 * @query gameId - 比赛ID (可选，用于从数据库查询)
 * @query hours - 时间范围 (1/6/24)，默认 24
 * @access Public
 */
router.get('/history', async (req, res, next) => {
    try {
        const { homeTeam, awayTeam, date, gameId, hours = 24 } = req.query;

        if (!homeTeam || !awayTeam || !date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: homeTeam, awayTeam, date'
            });
        }

        console.log(`[OddsHistory] Fetching history for ${awayTeam} @ ${homeTeam} on ${date}`);

        // 检查数据库是否可用
        let dbAvailable = false;
        try {
            dbAvailable = await healthCheck();
        } catch (e) {
            dbAvailable = false;
        }

        let historyFromDB = [];
        let source = 'simulated';

        // 如果有 gameId 且数据库可用，尝试从数据库获取历史
        if (gameId && dbAvailable) {
            try {
                historyFromDB = await OddsCollectorService.getOddsHistory(gameId, parseInt(hours));
                if (historyFromDB && historyFromDB.length > 0) {
                    source = 'database';
                    console.log(`[OddsHistory] Found ${historyFromDB.length} records in database`);
                }
            } catch (dbError) {
                console.warn('[OddsHistory] Database query failed:', dbError.message);
            }
        }

        // 获取当前 Polymarket 赔率
        let currentOdds = null;
        const datesToTry = [
            date,
            new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ];

        for (const tryDate of datesToTry) {
            const odds = await getGameOdds(awayTeam, homeTeam, tryDate);
            if (odds) {
                currentOdds = {
                    homeWinProbability: odds.homeWin,
                    awayWinProbability: odds.awayWin,
                    marketId: odds.marketId,
                    volume: odds.volume,
                };
                break;
            }
        }

        if (!currentOdds) {
            currentOdds = {
                homeWinProbability: 0.5,
                awayWinProbability: 0.5,
                marketId: null,
                volume: 0,
            };
        }

        // 使用数据库历史或生成模拟数据
        let history;
        if (historyFromDB && historyFromDB.length > 0) {
            history = formatHistoryFromDB(historyFromDB);
        } else {
            history = generateMockOddsHistory(currentOdds, parseInt(hours));
        }

        // 计算 24 小时变化
        const firstPoint = history[0];
        const lastPoint = history[history.length - 1];
        const change24h = firstPoint
            ? ((lastPoint.polymarket_home - firstPoint.polymarket_home) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            current: currentOdds,
            history,
            change24h: {
                polymarket: parseFloat(change24h),
            },
            meta: {
                homeTeam,
                awayTeam,
                date,
                gameId: gameId || null,
                pointsCount: history.length,
                source,  // 'database' 或 'simulated'
            }
        });
    } catch (error) {
        console.error('[OddsHistory] Error:', error);
        next(error);
    }
});

module.exports = router;
