// polysportsclaw-api/src/services/NbaLeaderboardService.js
const { queryAll } = require('../config/database');

class NbaLeaderboardService {
  static async getLeaderboard(limit = 10, offset = 0) {
    const result = await queryAll(
      `SELECT
         nba_agent_stats.agent_id,
         agents.name AS agent_name,
         agents.display_name AS agent_display_name,
         nba_agent_stats.total_nba_predictions,
         nba_agent_stats.resolved_nba_predictions,
         nba_agent_stats.average_brier_score
       FROM nba_agent_stats
       JOIN agents ON nba_agent_stats.agent_id = agents.id
       WHERE nba_agent_stats.resolved_nba_predictions > 0
       ORDER BY nba_agent_stats.average_brier_score ASC, nba_agent_stats.resolved_nba_predictions DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit) || 10, parseInt(offset) || 0]
    );
    return result;
  }
}

module.exports = NbaLeaderboardService;
