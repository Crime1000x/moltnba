const express = require('express');
const NbaLeaderboardService = require('../services/NbaLeaderboardService');

const router = express.Router();

/**
 * @route GET /api/nba/leaderboard
 * @desc Get the NBA prediction leaderboard
 * @access Public
 * @queryParam {number} limit - Number of agents to return
 * @queryParam {number} offset - Number of agents to skip
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const leaderboard = await NbaLeaderboardService.getLeaderboard(limit, offset);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
