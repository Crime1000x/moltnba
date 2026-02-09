// polysportsclaw-api/src/routes/live_score.js

const express = require('express');
const { getLiveGameData, findGameByTeams } = require('../services/PublicApiService');

const router = express.Router();

/**
 * @route GET /api/v1/live/find-game
 * @desc 根据球队名称查找比赛 ID
 * @query teamA - 球队A名称
 * @query teamB - 球队B名称
 * @query date - 可选，比赛日期 (YYYY-MM-DD)
 * @access Public
 */
router.get('/find-game', async (req, res, next) => {
    try {
        const { teamA, teamB, date } = req.query;

        if (!teamA || !teamB) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: teamA, teamB'
            });
        }

        const gameId = await findGameByTeams(teamA, teamB, date);

        if (!gameId) {
            return res.json({
                success: false,
                message: 'Game not found',
                gameId: null
            });
        }

        res.json({
            success: true,
            gameId
        });
    } catch (error) {
        console.error('[FindGame] Error:', error);
        next(error);
    }
});

/**
 * @route GET /api/v1/live/score
 * @desc 获取比赛实时比分
 * @query gameId - BallDontLie 比赛 ID
 * @access Public
 */
router.get('/score', async (req, res, next) => {
    try {
        const { gameId } = req.query;

        if (!gameId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: gameId'
            });
        }

        const liveData = await getLiveGameData(gameId);

        if (!liveData) {
            return res.json({
                success: false,
                message: 'Game not found',
                data: null
            });
        }

        res.json({
            success: true,
            data: liveData
        });
    } catch (error) {
        console.error('[LiveScore] Error:', error);
        next(error);
    }
});

/**
 * @route GET /api/v1/live/score-by-teams
 * @desc 根据球队名称获取实时比分 (两步合一)
 * @query teamA - 球队A名称
 * @query teamB - 球队B名称
 * @query date - 可选，比赛日期
 * @access Public
 */
router.get('/score-by-teams', async (req, res, next) => {
    try {
        const { teamA, teamB, date } = req.query;

        if (!teamA || !teamB) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: teamA, teamB'
            });
        }

        // 先找比赛 ID
        const gameId = await findGameByTeams(teamA, teamB, date);
        if (!gameId) {
            return res.json({
                success: false,
                message: 'Game not found',
                data: null
            });
        }

        // 获取实时数据
        const liveData = await getLiveGameData(gameId);
        if (!liveData) {
            return res.json({
                success: false,
                message: 'Live data not available',
                gameId,
                data: null
            });
        }

        res.json({
            success: true,
            data: liveData
        });
    } catch (error) {
        console.error('[LiveScoreByTeams] Error:', error);
        next(error);
    }
});

module.exports = router;
