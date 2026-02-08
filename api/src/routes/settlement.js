/**
 * 结算相关路由
 * 获取已结算比赛、手动触发结算、清理旧数据
 */

const express = require('express');
const { SettlementScheduler } = require('../services/SettlementScheduler');

const router = express.Router();

/**
 * @route GET /api/v1/settlement/games
 * @desc 获取已结算的比赛列表
 * @access Public
 */
router.get('/games', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const games = await SettlementScheduler.getSettledGames(Math.min(limit, 100));

        res.json({
            success: true,
            games,
            totalCount: games.length
        });
    } catch (error) {
        console.error('[Settlement Route] Error:', error.message);
        next(error);
    }
});

/**
 * @route POST /api/v1/settlement/run
 * @desc 手动触发一次结算（管理员用）
 * @access Private (未来可添加认证)
 */
router.post('/run', async (req, res, next) => {
    try {
        const { scheduler } = require('../services/SettlementScheduler');

        // 异步运行，不等待完成
        scheduler.runSettlement().catch(err => {
            console.error('[Settlement Route] Manual run error:', err.message);
        });

        res.json({
            success: true,
            message: 'Settlement run started in background'
        });
    } catch (error) {
        console.error('[Settlement Route] Error:', error.message);
        next(error);
    }
});

/**
 * @route DELETE /api/v1/settlement/cleanup
 * @desc 清理旧的已结算预测（管理员用）
 * @access Private (未来可添加认证)
 */
router.delete('/cleanup', async (req, res, next) => {
    try {
        const daysToKeep = parseInt(req.query.days) || 30;
        const result = await SettlementScheduler.cleanupOldPredictions(daysToKeep);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[Settlement Route] Error:', error.message);
        next(error);
    }
});

module.exports = router;
