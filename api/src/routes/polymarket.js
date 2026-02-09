const express = require('express');
const PolymarketDataService = require('../services/PolymarketDataService');
const LeaderboardService = require('../services/LeaderboardService');
const { NotFoundError } = require('../utils/errors');
// Removed requireAuth to make markets public for frontend demo
// const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure authentication for all polymarket routes
// router.use(requireAuth); // DISABLED FOR DEMO

/**
 * @route GET /api/polymarket/markets
 * @desc Get all Polymarket markets
 * @access Public (Changed for demo)
 */
router.get('/markets', async (req, res, next) => {
  try {
    const markets = await PolymarketDataService.getActiveMarkets();
    res.json(markets);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/polymarket/markets/:id
 * @desc Get a single Polymarket market by ID
 * @access Public (Changed for demo)
 */
router.get('/markets/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const market = await PolymarketDataService.getMarketByPolymarketId(id);

    if (!market) {
      throw new NotFoundError(`Polymarket market with ID ${id} not found.`);
    }
    res.json(market);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/polymarket/leaderboard
 * @desc Get agent leaderboard
 * @access Public (Changed for demo)
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    // Assuming LeaderboardService is implemented or mock it
    // const leaderboard = await LeaderboardService.getLeaderboard({ limit, offset });
    res.json([]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
