/**
 * Markets 路由
 * 提供 NBA 比赛列表供 Agent 预测
 */

const express = require('express');
const { getUnifiedNBAData, getEnhancedNBAData } = require('../services/PublicApiService');

const router = express.Router();

/**
 * @route GET /api/v1/markets/top
 * @desc 获取可预测的 NBA 比赛列表
 * @access Public (但建议使用 Token)
 */
router.get('/top', async (req, res, next) => {
    try {
        // 获取增强数据（含战绩、伤病、赔率）
        const data = await getEnhancedNBAData(true);

        // 只返回未结束的比赛
        const upcomingGames = data.games.filter(g =>
            g.status !== 'final' &&
            new Date(g.gameTime) > new Date()
        );

        const markets = upcomingGames.map(game => ({
            gameId: game.gameId,
            title: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
            description: `NBA Regular Season: ${game.awayTeam.name} vs ${game.homeTeam.name}`,
            homeTeam: {
                name: game.homeTeam.name,
                abbreviation: game.homeTeam.abbreviation,
                logo: game.homeTeam.logo,
                score: game.homeTeam.score || 0,
                record: game.homeTeam.record || null,
                injuries: game.homeTeam.injuries || []
            },
            awayTeam: {
                name: game.awayTeam.name,
                abbreviation: game.awayTeam.abbreviation,
                logo: game.awayTeam.logo,
                score: game.awayTeam.score || 0,
                record: game.awayTeam.record || null,
                injuries: game.awayTeam.injuries || []
            },
            gameTime: game.gameTime,
            status: game.status,
            polymarketOdds: game.polymarketOdds || null,
            category: 'nba'
        }));

        res.json({
            success: true,
            markets,
            cachedAt: new Date().toISOString(),
            totalCount: markets.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/v1/markets/enhanced
 * @desc 获取增强版比赛数据（含战绩、伤病）
 * @access Public
 */
router.get('/enhanced', async (req, res, next) => {
    try {
        const includeOdds = req.query.odds === 'true';
        const data = await getEnhancedNBAData(includeOdds);

        // 只返回未结束的比赛
        const upcomingGames = data.games.filter(g =>
            g.status !== 'final' &&
            new Date(g.gameTime) > new Date()
        );

        const markets = upcomingGames.map(game => ({
            gameId: game.gameId,
            title: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
            description: `NBA Regular Season: ${game.awayTeam.name} vs ${game.homeTeam.name}`,
            homeTeam: {
                name: game.homeTeam.name,
                abbreviation: game.homeTeam.abbreviation,
                logo: game.homeTeam.logo,
                // 增强信息
                record: game.homeTeam.record,
                injuries: game.homeTeam.injuries
            },
            awayTeam: {
                name: game.awayTeam.name,
                abbreviation: game.awayTeam.abbreviation,
                logo: game.awayTeam.logo,
                // 增强信息
                record: game.awayTeam.record,
                injuries: game.awayTeam.injuries
            },
            gameTime: game.gameTime,
            status: game.status,
            polymarketOdds: game.polymarketOdds,
            category: 'nba'
        }));

        res.json({
            success: true,
            markets,
            meta: data.meta,
            totalCount: markets.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route GET /api/v1/markets/:gameId
 * @desc 获取单场比赛详情
 * @access Public
 */
router.get('/:gameId', async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const includeEnhanced = req.query.enhanced === 'true';

        // 获取比赛数据
        let game;
        if (includeEnhanced) {
            const data = await getEnhancedNBAData(true);
            game = data.games.find(g => g.gameId === gameId);
        } else {
            const games = await getUnifiedNBAData(true);
            game = games.find(g => g.gameId === gameId);
        }

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'NotFoundError',
                message: 'Game not found'
            });
        }

        // 获取该比赛的预测
        const PredictionService = require('../services/PredictionService');
        const predictions = await PredictionService.getPredictionsByGame(gameId);

        res.json({
            success: true,
            market: {
                gameId: game.gameId,
                title: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
                description: `NBA Regular Season: ${game.awayTeam.name} vs ${game.homeTeam.name}`,
                homeTeam: {
                    name: game.homeTeam.name,
                    abbreviation: game.homeTeam.abbreviation,
                    logo: game.homeTeam.logo,
                    score: game.homeTeam.score,
                    record: game.homeTeam.record || null,
                    injuries: game.homeTeam.injuries || []
                },
                awayTeam: {
                    name: game.awayTeam.name,
                    abbreviation: game.awayTeam.abbreviation,
                    logo: game.awayTeam.logo,
                    score: game.awayTeam.score,
                    record: game.awayTeam.record || null,
                    injuries: game.awayTeam.injuries || []
                },
                gameTime: game.gameTime,
                status: game.status,
                isLive: game.isLive,
                isFinal: game.isFinal,
                polymarketOdds: game.polymarketOdds,
                category: 'nba'
            },
            predictions: predictions.map(p => ({
                agentId: p.agentId,
                agentName: p.agentName,
                pHome: parseFloat(p.pHome),
                rationale: p.rationale,
                createdAt: p.createdAt
            })),
            predictionCount: predictions.length
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
