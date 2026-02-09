// polysportsclaw-api/src/services/NbaPredictionService.js
const { queryOne, queryAll, transaction } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { NbaMarket, NbaMarketOutcome, NbaPrediction } = require('../models');
const NbaLeaderboardService = require('./NbaLeaderboardService'); // Import NbaLeaderboardService

class NbaPredictionService {
  /**
   * Submits a new NBA prediction or updates an existing one for an agent on a specific market.
   * @param {object} predictionData - Object containing prediction data.
   * @param {string} predictionData.agent_id - The UUID of the agent.
   * @param {string} predictionData.nba_market_id - The UUID of the NBA market.
   * @param {string} predictionData.predicted_outcome_id - The UUID of the predicted outcome.
   * @param {number} predictionData.p_value - Probability of the predicted outcome (0.0 to 1.0).
   * @param {string} predictionData.rationale - Agent's explanation for the prediction.
   * @returns {Promise<object>} The created or updated prediction object.
   */
  static async submitPrediction(predictionData) {
    const db = await transaction();
    try {
      const { agent_id, nba_market_id, predicted_outcome_id, p_value, rationale } = predictionData;

      // Validate p_value
      if (typeof p_value !== 'number' || p_value < 0 || p_value > 1) {
        throw new BadRequestError('p_value must be a number between 0.0 and 1.0.');
      }

      // Check if market exists and is open
      const market = await NbaMarket.findById(nba_market_id, db);
      if (!market) {
        throw new NotFoundError(`NBA Market with ID ${nba_market_id} not found.`);
      }
      if (market.status !== 'open') {
        throw new ConflictError(`Cannot submit prediction for market ${nba_market_id} as it is not open.`);
      }

      // Check if predicted outcome belongs to this market
      const outcome = await NbaMarketOutcome.findById(predicted_outcome_id, db);
      if (!outcome || outcome.nba_market_id !== nba_market_id) {
        throw new BadRequestError(`Predicted outcome ID ${predicted_outcome_id} does not belong to market ${nba_market_id}.`);
      }

      let prediction;
      const existingPrediction = await NbaPrediction.findByAgentAndMarket(agent_id, nba_market_id, db);

      if (existingPrediction) {
        // Update existing prediction
        prediction = await NbaPrediction.update(existingPrediction.id, {
          predicted_outcome_id,
          p_value,
          rationale,
        }, db);
      } else {
        // Create new prediction
        prediction = await NbaPrediction.create(predictionData, db);
      }

      await db.commit();
      return prediction;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get an NBA prediction by agent ID and market ID.
   * @param {string} agentId - The UUID of the agent.
   * @param {string} nbaMarketId - The UUID of the NBA market.
   * @returns {Promise<object|null>} The prediction object or null if not found.
   */
  static async getPredictionByAgentAndMarket(agentId, nbaMarketId) {
    const db = await transaction();
    try {
      const prediction = await NbaPrediction.findByAgentAndMarket(agentId, nbaMarketId, db);
      await db.commit();
      return prediction;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get all NBA predictions for a specific agent.
   * @param {string} agentId - The UUID of the agent.
   * @returns {Promise<object[]>} An array of prediction objects.
   */
  static async getPredictionsByAgent(agentId) {
    const db = await transaction();
    try {
      const predictions = await NbaPrediction.findByAgentId(agentId, db); // Assuming findByAgentId exists on NbaPrediction
      await db.commit();
      return predictions;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get all NBA predictions for a specific market.
   * @param {string} nbaMarketId - The UUID of the NBA market.
   * @returns {Promise<object[]>} An array of prediction objects.
   */
  static async getPredictionsByMarket(nbaMarketId) {
    const db = await transaction();
    try {
      const predictions = await NbaPrediction.findByMarketId(nbaMarketId, db);
      await db.commit();
      return predictions;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Calculate the Brier Score for a single prediction.
   * @param {number} p_value - The predicted probability (0.0 to 1.0).
   * @param {number} actual_outcome - The actual outcome (1 for YES, 0 for NO).
   * @returns {number} The calculated Brier Score.
   */
  static calculateBrierScore(p_value, actual_outcome) {
    if (typeof p_value !== 'number' || p_value < 0 || p_value > 1) {
      throw new BadRequestError('p_value must be a number between 0.0 and 1.0 for Brier Score calculation.');
    }
    if (actual_outcome !== 0 && actual_outcome !== 1) {
      throw new BadRequestError('actual_outcome must be 0 or 1 for Brier Score calculation.');
    }
    return Math.pow(p_value - actual_outcome, 2);
  }

  /**
   * Updates the Brier Score for all predictions on a resolved market.
   * This should be called after NbaMarketService.resolveMarket.
   * @param {string} nbaMarketId - The UUID of the resolved NBA market.
   * @param {string} resolvedOutcomeId - The UUID of the winning outcome.
   * @param {object} [dbClient=null] - Optional database client instance for transactions.
   * @returns {Promise<void>}
   */
  static async updateBrierScoresForMarket(nbaMarketId, resolvedOutcomeId, dbClient = null) {
    const useTransaction = !dbClient;
    const db = useTransaction ? await transaction() : dbClient;

    try {
      const market = await NbaMarket.findById(nbaMarketId, db);
      if (!market || market.status !== 'resolved' || market.resolved_outcome_id !== resolvedOutcomeId) {
        // Market is not resolved or resolved outcome does not match
        throw new BadRequestError(`Market ${nbaMarketId} is not resolved with outcome ${resolvedOutcomeId}.`);
      }

      const predictions = await NbaPrediction.findByMarketId(nbaMarketId, db);

      for (const prediction of predictions) {
        // Determine if the agent's predicted outcome matches the actual resolved outcome
        const actualOutcome = (prediction.predicted_outcome_id === resolvedOutcomeId) ? 1 : 0;
        
        // Use the agent's predicted p_value
        const brierScore = NbaPredictionService.calculateBrierScore(prediction.p_value, actualOutcome);

        await NbaPrediction.updateBrierScore(prediction.id, brierScore, db);
        
        // Update Agent's NBA statistics
        await NbaLeaderboardService.updateAgentNbaStats(prediction.agent_id, brierScore, db);
      }
      if (useTransaction) await db.commit();
    } catch (error) {
      if (useTransaction) await db.rollback();
      throw error;
    } finally {
      if (useTransaction) db.release();
    }
  }
}

module.exports = NbaPredictionService;
