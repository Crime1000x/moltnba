/**
 * 赔率采集服务 (MySQL 版本)
 * 定期从 Polymarket 采集赔率数据并存储到数据库
 */

const { query } = require('../config/database');
const { getUnifiedNBAData } = require('./PublicApiService');

class OddsCollectorService {
    /**
     * 采集单场比赛的赔率并存储
     * @param {Object} game - 比赛对象 (来自 PublicApiService)
     */
    static async collectOddsForGame(game) {
        try {
            if (!game.polymarketOdds) {
                // 没有 Polymarket 赔率，跳过
                return null;
            }

            const odds = game.polymarketOdds;

            const result = await query(
                `INSERT IGNORE INTO odds_history 
                 (game_id, home_team, away_team, home_probability, away_probability, polymarket_token_id, volume)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    game.gameId,
                    game.homeTeam.name,
                    game.awayTeam.name,
                    odds.homeWinProbability || null,
                    odds.awayWinProbability || null,
                    odds.tokenId || null,
                    odds.volume || 0
                ]
            );

            if (result.affectedRows > 0) {
                console.log(`Collected odds for game ${game.gameId}: Home ${(odds.homeWinProbability * 100).toFixed(1)}% vs Away ${(odds.awayWinProbability * 100).toFixed(1)}%`);
            }

            return result;
        } catch (error) {
            // 忽略重复插入错误
            if (error.code !== 'ER_DUP_ENTRY') {
                console.error(`Error collecting odds for game ${game.gameId}:`, error.message);
            }
            return null;
        }
    }

    /**
     * 采集所有活跃比赛的赔率
     */
    static async collectAllActiveGames() {
        console.log('Starting odds collection for all active games...');

        try {
            // 获取今天和明天的比赛 (includeOdds=true 获取 Polymarket 赔率)
            const games = await getUnifiedNBAData(true);

            // 只采集有 Polymarket 赔率的未结束比赛
            const activeGames = games.filter(g =>
                g.status !== 'final' && g.polymarketOdds
            );

            console.log(`Found ${activeGames.length} active games with Polymarket odds`);

            let collected = 0;
            for (const game of activeGames) {
                const result = await this.collectOddsForGame(game);
                if (result && result.affectedRows > 0) collected++;
            }

            console.log(`Odds collection complete: ${collected}/${activeGames.length} games`);
            return collected;
        } catch (error) {
            console.error('Error in collectAllActiveGames:', error.message);
            return 0;
        }
    }

    /**
     * 获取比赛的历史赔率 (MySQL 语法)
     * @param {string} gameId - 比赛 ID
     * @param {number} hoursBack - 回溯小时数 (默认 24)
     */
    static async getOddsHistory(gameId, hoursBack = 24) {
        try {
            const result = await query(
                `SELECT 
                   game_id,
                   home_team,
                   away_team,
                   home_probability,
                   away_probability,
                   volume,
                   collected_at
                 FROM odds_history
                 WHERE game_id = ?
                   AND collected_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
                 ORDER BY collected_at ASC`,
                [gameId, hoursBack]
            );

            return result.rows || [];
        } catch (error) {
            console.error(`Error getting odds history for game ${gameId}:`, error.message);
            return [];
        }
    }

    /**
     * 清理过期的历史记录 (MySQL 语法)
     * @param {number} hoursToKeep - 保留多少小时的数据 (默认 48)
     */
    static async cleanOldRecords(hoursToKeep = 48) {
        try {
            const result = await query(
                `DELETE FROM odds_history 
                 WHERE collected_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
                [hoursToKeep]
            );

            if (result.affectedRows > 0) {
                console.log(`Cleaned ${result.affectedRows} old odds records`);
            }

            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning old odds records:', error.message);
            return 0;
        }
    }
}

module.exports = OddsCollectorService;
