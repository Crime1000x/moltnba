const { queryOne, queryAll, transaction } = require('../config/database');

class LeaderboardService {
  /**
   * Updates an agent's prediction statistics after a market is resolved.
   * Creates an entry in agent_stats if it doesn't exist.
   *
   * @param {string} agentId - The ID of the agent.
   * @param {boolean} isCorrect - True if the prediction was correct, false otherwise.
   * @returns {Promise<Object>} The updated agent stats.
   */
  static async updateAgentStats(agentId, isCorrect) {
    return transaction(async (client) => {
      let agentStats = await queryOne('SELECT * FROM agent_stats WHERE agent_id = $1', [agentId], client);

      if (!agentStats) {
        // Create new stats entry if none exists
        agentStats = await client.query(
          `INSERT INTO agent_stats (agent_id, total_predictions, correct_predictions, win_rate, current_streak, best_streak)
           VALUES ($1, 0, 0, 0, 0, 0) RETURNING *`,
          [agentId]
        );
        agentStats = agentStats.rows[0];
      }

      agentStats.total_predictions += 1;
      if (isCorrect) {
        agentStats.correct_predictions += 1;
        agentStats.current_streak += 1;
      } else {
        agentStats.current_streak = 0; // Reset streak on incorrect prediction
      }

      // Update best streak
      if (agentStats.current_streak > agentStats.best_streak) {
        agentStats.best_streak = agentStats.current_streak;
      }

      // Recalculate win rate
      agentStats.win_rate = agentStats.total_predictions > 0
        ? agentStats.correct_predictions / agentStats.total_predictions
        : 0;

      // Update in DB
      const updatedStats = await client.query(
        `UPDATE agent_stats
         SET
           total_predictions = $2,
           correct_predictions = $3,
           win_rate = $4,
           current_streak = $5,
           best_streak = $6,
           updated_at = NOW()
         WHERE agent_id = $1
         RETURNING *`,
        [
          agentId,
          agentStats.total_predictions,
          agentStats.correct_predictions,
          agentStats.win_rate,
          agentStats.current_streak,
          agentStats.best_streak,
        ]
      );
      return updatedStats.rows[0];
    });
  }

  /**
   * Updates an agent's prediction statistics when a market is canceled.
   * Canceled markets still count towards total predictions but not correct ones.
   * Streaks are reset if currently positive.
   *
   * @param {string} agentId - The ID of the agent.
   * @returns {Promise<Object>} The updated agent stats.
   */
  static async updateAgentStatsForCanceledMarket(agentId) {
    return transaction(async (client) => {
      let agentStats = await queryOne('SELECT * FROM agent_stats WHERE agent_id = $1', [agentId], client);

      if (!agentStats) {
        // Create new stats entry if none exists
        agentStats = await client.query(
          `INSERT INTO agent_stats (agent_id, total_predictions, correct_predictions, win_rate, current_streak, best_streak)
           VALUES ($1, 0, 0, 0, 0, 0) RETURNING *`,
          [agentId]
        );
        agentStats = agentStats.rows[0];
      }

      agentStats.total_predictions += 1;
      // Canceled markets do not count as correct, so correct_predictions is not incremented.
      // If current streak is positive, it should be reset on a non-winning prediction.
      if (agentStats.current_streak > 0) {
        agentStats.current_streak = 0;
      }

      // Recalculate win rate
      agentStats.win_rate = agentStats.total_predictions > 0
        ? agentStats.correct_predictions / agentStats.total_predictions
        : 0;

      // Update in DB
      const updatedStats = await client.query(
        `UPDATE agent_stats
         SET
           total_predictions = $2,
           correct_predictions = $3,
           win_rate = $4,
           current_streak = $5,
           best_streak = $6,
           updated_at = NOW()
         WHERE agent_id = $1
         RETURNING *`,
        [
          agentId,
          agentStats.total_predictions,
          agentStats.correct_predictions,
          agentStats.win_rate,
          agentStats.current_streak,
          agentStats.best_streak,
        ]
      );
      return updatedStats.rows[0];
    });
  }

  /**
   * Retrieves the agent leaderboard.
   *
   * @param {Object} options - Query options.
   * @param {number} [options.limit=10] - Number of agents to return.
   * @param {number} [options.offset=0] - Offset for pagination.
   * @returns {Promise<Array>} A list of agents with their stats, ordered by win rate.
   */
  static async getLeaderboard({ limit = 10, offset = 0 }) {
    const leaderboard = await queryAll(
      `SELECT
         as.agent_id,
         a.name as agent_name,
         a.display_name as agent_display_name,
         as.total_predictions,
         as.correct_predictions,
         as.win_rate,
         as.current_streak,
         as.best_streak
       FROM agent_stats as
       JOIN agents a ON as.agent_id = a.id
       ORDER BY as.win_rate DESC, as.correct_predictions DESC, as.total_predictions DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return leaderboard;
  }
}

module.exports = LeaderboardService;
