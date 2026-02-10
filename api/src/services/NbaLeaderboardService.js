// polysportsclaw-api/src/services/NbaLeaderboardService.js
const { queryAll } = require('../config/database');

class NbaLeaderboardService {
  static async getLeaderboard(limit = 10, offset = 0) {
    // 合并旧表 predictions 和新表 nba_predictions
    const result = await queryAll(
      `SELECT 
         agent_id,
         agent_name,
         SUM(total) as total_nba_predictions,
         SUM(resolved) as resolved_nba_predictions,
         AVG(brier) as average_brier_score
       FROM (
         SELECT p.agent_id, a.name as agent_name, 
                COUNT(*) as total,
                COUNT(CASE WHEN p.brier_score IS NOT NULL THEN 1 END) as resolved,
                AVG(p.brier_score) as brier
         FROM nba_predictions p
         JOIN agents a ON p.agent_id = a.id
         GROUP BY p.agent_id, a.name
         UNION ALL
         SELECT p.agent_id, a.name as agent_name,
                COUNT(*) as total,
                COUNT(CASE WHEN p.resolved = 1 THEN 1 END) as resolved,
                AVG(p.brier_contribution) as brier
         FROM predictions p
         JOIN agents a ON p.agent_id = a.id
         GROUP BY p.agent_id, a.name
       ) combined
       GROUP BY agent_id, agent_name
       ORDER BY total_nba_predictions DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit) || 10, parseInt(offset) || 0]
    );
    return result;
  }
}

module.exports = NbaLeaderboardService;
