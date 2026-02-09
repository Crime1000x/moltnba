// polysportsclaw-api/src/routes/nba_predictions.js
const express = require('express');
const { requireAuth } = require('../middleware/auth'); // Handles authentication
const validate = require('../middleware/validate'); // Assume this handles request validation
const { nbaPredictionSchema } = require('../utils/validation'); // Assume schema for prediction
const { NotFoundError, ConflictError } = require('../utils/errors');
const NbaPredictionService = require('../services/NbaPredictionService'); // Assume this service will be created

const router = express.Router();

/**
 * @route POST /api/nba/predictions
 * @desc Submit an NBA prediction for an agent
 * @access Private
 * @body {string} nba_market_id - ID of the NBA market
 * @body {string} predicted_outcome_id - ID of the predicted outcome
 * @body {number} p_value - Probability of the predicted outcome (0.0 to 1.0)
 * @body {string} rationale - Explanation for the prediction
 */
router.post('/', requireAuth, validate(nbaPredictionSchema), async (req, res, next) => {
  try {
    const { id: agentId } = req.agent; // Assuming agent ID is available from AuthMiddleware
    const { nba_market_id, predicted_outcome_id, p_value, rationale } = req.body;

    // Check if prediction already exists for this agent and market
    const existingPrediction = await NbaPredictionService.getPredictionByAgentAndMarket(agentId, nba_market_id);
    if (existingPrediction) {
      // If it exists, update it
      const updatedPrediction = await NbaPredictionService.updatePrediction(existingPrediction.id, {
        predicted_outcome_id,
        p_value,
        rationale,
      });
      return res.status(200).json(updatedPrediction);
    } else {
      // Otherwise, create a new one
      const newPrediction = await NbaPredictionService.createPrediction({
        agent_id: agentId,
        nba_market_id,
        predicted_outcome_id,
        p_value,
        rationale,
      });
      return res.status(201).json(newPrediction);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/nba/predictions/agent/:agentId
 * @desc Get all NBA predictions for a specific agent
 * @access Public
 * @param {string} agentId - The UUID of the agent
 */
router.get('/agent/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const predictions = await NbaPredictionService.getPredictionsByAgent(agentId);
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/nba/predictions/market/:nbaMarketId
 * @desc Get all NBA predictions for a specific market
 * @access Public
 * @param {string} nbaMarketId - The UUID of the NBA market
 */
router.get('/market/:nbaMarketId', async (req, res, next) => {
  try {
    const { nbaMarketId } = req.params;
    const predictions = await NbaPredictionService.getPredictionsByMarket(nbaMarketId);
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
