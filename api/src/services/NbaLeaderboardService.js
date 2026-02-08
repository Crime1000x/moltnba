// polysportsclaw-api/src/services/NbaLeaderboardService.js
const { transaction } = require('../config/database');
const { NbaAgentStats } = require('../models');

class NbaLeaderboardService {
  /**
   * Retrieves the NBA agent leaderboard.
   * Agents are ranked by average Brier score (lower is better), then by resolved predictions (higher is better).
   *
   * @param {object} options - Query options.
   * @param {number} [options.limit=10] - Number of agents to return.
   * @param {number} [options.offset=0] - Offset for pagination.
   * @returns {Promise<Array>} A list of agents with their NBA stats, ordered by average Brier score.
   */
  static async getLeaderboard({ limit = 10, offset = 0 }) {
    const db = await transaction(); // Acquire a client from the pool
    try {
      const leaderboard = await NbaAgentStats.getLeaderboard(limit, offset, db);
      await db.commit();
      return leaderboard;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release(); // Release the client back to the pool
    }
  }

  /**
   * Updates an agent's NBA prediction statistics after a prediction is resolved.
   * This is called by NbaPredictionService after a prediction's Brier score is calculated.
   *
   * @param {string} agentId - The ID of the agent.
   * @param {number} newBrierScore - The Brier score of the just-resolved prediction.
   * @param {object} dbClient - Database client instance (optional, for transactions).
   * @returns {Promise<object>} The updated agent NBA stats.
   */
  static async updateAgentNbaStats(agentId, newBrierScore, dbClient = null) {
    const useTransaction = !dbClient;
    const db = useTransaction ? await transaction() : dbClient;

    try {
      let stats = await NbaAgentStats.findOrCreate(agentId, db);
      
      const newTotalPredictions = stats.total_nba_predictions + 1;
      const newResolvedPredictions = stats.resolved_nba_predictions + 1;
      const newTotalBrierScore = parseFloat(stats.total_brier_score) + newBrierScore;
      const newAverageBrierScore = newResolvedPredictions > 0
        ? newTotalBrierScore / newResolvedPredictions
        : 0;

      const updatedStats = await NbaAgentStats.update(agentId, {
        total_nba_predictions: newTotalPredictions,
        resolved_nba_predictions: newResolvedPredictions,
        total_brier_score: newTotalBrierScore,
        average_brier_score: newAverageBrierScore,
      }, db);
      
      if (useTransaction) await db.commit();
      return updatedStats;
    } catch (error) {
      if (useTransaction) await db.rollback();
      throw error;
    } finally {
      if (useTransaction) db.release();
    }
  }
}

module.exports = NbaLeaderboardService;
