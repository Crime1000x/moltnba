/**
 * 自动结算定时任务
 * 每小时检查已结束的比赛并自动结算预测
 */

const PredictionService = require('./PredictionService');
const { getUnifiedNBAData } = require('./PublicApiService');

class SettlementScheduler {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * 启动定时任务
     * @param {number} intervalMs - 运行间隔（毫秒），默认 1 小时
     */
    start(intervalMs = 60 * 60 * 1000) {
        if (this.intervalId) {
            console.log('[Settlement] Scheduler already running');
            return;
        }

        console.log(`[Settlement] Starting scheduler, interval: ${intervalMs / 1000 / 60} minutes`);

        // 启动时立即运行一次
        this.runSettlement();

        // 设置定时任务
        this.intervalId = setInterval(() => {
            this.runSettlement();
        }, intervalMs);
    }

    /**
     * 停止定时任务
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Settlement] Scheduler stopped');
        }
    }

    /**
     * 执行结算逻辑
     */
    async runSettlement() {
        if (this.isRunning) {
            console.log('[Settlement] Previous run still in progress, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('[Settlement] Starting settlement check at', new Date().toISOString());

        try {
            // 获取所有比赛数据
            const games = await getUnifiedNBAData(false);

            // 筛选已结束的比赛
            const finishedGames = games.filter(game => game.isFinal);

            let settledCount = 0;

            for (const game of finishedGames) {
                try {
                    // 确定比赛结果
                    const homeScore = game.homeTeam.score || 0;
                    const awayScore = game.awayTeam.score || 0;

                    if (homeScore === 0 && awayScore === 0) {
                        // 没有比分数据，跳过
                        continue;
                    }

                    const outcome = homeScore > awayScore ? 'home' : 'away';

                    // 尝试结算
                    const result = await PredictionService.resolvePredictions(game.gameId, outcome);

                    if (result.resolved > 0) {
                        console.log(`[Settlement] Game ${game.gameId}: ${game.homeTeam.name} vs ${game.awayTeam.name} - ${outcome} won, resolved ${result.resolved} predictions`);
                        settledCount += result.resolved;
                    }
                } catch (err) {
                    // 单场比赛结算失败不影响其他
                    console.warn(`[Settlement] Error settling game ${game.gameId}:`, err.message);
                }
            }

            console.log(`[Settlement] Complete. Total settled: ${settledCount} predictions`);

        } catch (error) {
            console.error('[Settlement] Error during settlement run:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 获取已结算的比赛列表
     */
    static async getSettledGames(limit = 20) {
        const { query } = require('../config/database');

        const result = await query(
            `SELECT DISTINCT 
        p.game_id as gameId,
        p.home_team as homeTeam,
        p.away_team as awayTeam,
        p.game_time as gameTime,
        p.actual_outcome as outcome,
        COUNT(*) as predictionCount,
        AVG(p.brier_contribution) as avgBrierScore,
        MAX(p.updated_at) as settledAt
      FROM predictions p
      WHERE p.resolved = TRUE
      GROUP BY p.game_id, p.home_team, p.away_team, p.game_time, p.actual_outcome
      ORDER BY settledAt DESC
      LIMIT ?`,
            [limit]
        );

        return result.rows || [];
    }

    /**
     * 清理旧的已结算预测（超过指定天数）
     * @param {number} daysToKeep - 保留天数，默认 30 天
     */
    static async cleanupOldPredictions(daysToKeep = 30) {
        const { query } = require('../config/database');

        const result = await query(
            `DELETE FROM predictions 
       WHERE resolved = TRUE 
       AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [daysToKeep]
        );

        const deleted = result.affectedRows || 0;
        console.log(`[Settlement] Cleaned up ${deleted} old predictions (older than ${daysToKeep} days)`);

        return { deleted, daysToKeep };
    }
}

// 单例
const scheduler = new SettlementScheduler();

module.exports = {
    SettlementScheduler,
    scheduler
};
