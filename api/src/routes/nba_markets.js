// polysportsclaw-api/src/routes/nba_markets.js
const express = require('express');
const { NotFoundError } = require('../utils/errors');
const NbaMarketService = require('../services/NbaMarketService'); // Assume this service will be created

const router = express.Router();

/**
 * @route GET /api/nba/markets
 * @desc Get all NBA prediction markets
 * @access Public
 * @queryParam {string} status - Filter by market status (e.g., 'open', 'resolved')
 * @queryParam {string} category - Filter by market category (e.g., 'game_winner', 'player_points')
 * @queryParam {number} limit - Number of markets to return
 * @queryParam {number} offset - Number of markets to skip
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, category, limit, offset } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;

    // Assuming NbaMarketService.getMarkets will handle fetching and filtering
    const markets = await NbaMarketService.getMarkets(filters, limit, offset);
    res.json(markets);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/nba/markets/:id
 * @desc Get a single NBA prediction market by ID
 * @access Public
 * @param {string} id - The UUID of the market
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const market = await NbaMarketService.getMarketById(id);

    if (!market) {
      throw new NotFoundError(`NBA Market with ID ${id} not found.`);
    }
    res.json(market);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/nba/markets/:slug
 * @desc Get a single NBA prediction market by slug
 * @access Public
 * @param {string} slug - The slug of the market
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const market = await NbaMarketService.getMarketBySlug(slug);

    if (!market) {
      throw new NotFoundError(`NBA Market with slug ${slug} not found.`);
    }
    res.json(market);
  } catch (error) {
    next(error);
  }
});


module.exports = router;

/**
 * @route POST /api/nba/markets/:id/resolve
 * @desc Resolve a market with winning outcome
 * @access Admin
 */
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { winning_outcome_id } = req.body;
    
    if (!winning_outcome_id) {
      return res.status(400).json({ error: 'winning_outcome_id required' });
    }

    const NbaPredictionService = require('../services/NbaPredictionService');
    const result = await NbaPredictionService.resolveMarketPredictions(id, winning_outcome_id);
    
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});
