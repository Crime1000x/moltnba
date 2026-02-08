// polysportsclaw-api/src/routes/polymarket_odds.js

const express = require('express');
const { getGameOdds, constructEventSlug, fetchEventBySlug } = require('../services/PolymarketService');

const router = express.Router();

/**
 * 尝试多个日期获取 Polymarket 赔率（处理时区问题）
 * Polymarket 使用美国本地日期，可能与 BallDontLie 的日期差一天
 */
async function getGameOddsWithDateFallback(awayTeam, homeTeam, date) {
    // 尝试原始日期
    let odds = await getGameOdds(awayTeam, homeTeam, date);
    if (odds) {
        console.log(`[PolymarketOdds] Found market for date: ${date}`);
        return odds;
    }

    // 尝试前一天（时区差异可能导致日期偏移）
    const dateObj = new Date(date);
    const prevDate = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    odds = await getGameOdds(awayTeam, homeTeam, prevDate);
    if (odds) {
        console.log(`[PolymarketOdds] Found market for prev date: ${prevDate}`);
        return odds;
    }

    // 尝试后一天
    const nextDate = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    odds = await getGameOdds(awayTeam, homeTeam, nextDate);
    if (odds) {
        console.log(`[PolymarketOdds] Found market for next date: ${nextDate}`);
        return odds;
    }

    console.log(`[PolymarketOdds] No market found for any date variation`);
    return null;
}

/**
 * @route GET /api/v1/polymarket/odds
 * @desc Get Polymarket odds for a specific NBA game
 * @query homeTeam - Full name of the home team (e.g., "Boston Celtics")
 * @query awayTeam - Full name of the away team (e.g., "Los Angeles Lakers")
 * @query date - Game date in YYYY-MM-DD format
 * @access Public
 */
router.get('/odds', async (req, res, next) => {
    try {
        const { homeTeam, awayTeam, date } = req.query;

        if (!homeTeam || !awayTeam || !date) {
            return res.status(400).json({
                error: 'Missing required parameters: homeTeam, awayTeam, date'
            });
        }

        console.log(`[PolymarketOdds] Fetching odds for ${awayTeam} @ ${homeTeam} on ${date}`);

        // 使用带日期回退的函数获取赔率
        const odds = await getGameOddsWithDateFallback(awayTeam, homeTeam, date);

        if (!odds) {
            return res.json({
                success: false,
                message: 'No Polymarket market found for this game',
                odds: null
            });
        }

        res.json({
            success: true,
            odds: {
                homeWinProbability: odds.homeWin,
                awayWinProbability: odds.awayWin,
                marketId: odds.marketId,
                volume: odds.volume
            }
        });
    } catch (error) {
        console.error('[PolymarketOdds] Error:', error);
        next(error);
    }
});

/**
 * @route GET /api/v1/polymarket/event
 * @desc Get raw Polymarket event data by slug
 * @query slug - Polymarket event slug (e.g., "nba-lal-bos-2026-02-03")
 * @access Public
 */
router.get('/event', async (req, res, next) => {
    try {
        const { slug } = req.query;

        if (!slug) {
            return res.status(400).json({ error: 'Missing required parameter: slug' });
        }

        const event = await fetchEventBySlug(slug);

        if (!event) {
            return res.json({
                success: false,
                message: 'Event not found',
                event: null
            });
        }

        res.json({
            success: true,
            event
        });
    } catch (error) {
        console.error('[PolymarketEvent] Error:', error);
        next(error);
    }
});

module.exports = router;
