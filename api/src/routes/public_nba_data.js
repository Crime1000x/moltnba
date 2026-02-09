// polysportsclaw-api/src/routes/public_nba_data.js

const express = require('express');
const { getEnhancedNBAData } = require('../services/PublicApiService');

const router = express.Router();

/**
 * @route GET /api/public/nba-games
 * @desc Get aggregated NBA game data with Polymarket odds, team logos, and injuries.
 * @access Public (can be protected with API Key if needed, but for now, public as per doc)
 */
router.get('/', async (req, res, next) => {
  try {
    // Optional: API Key validation if this public endpoint needs protection
    // const apiKey = req.headers['x-api-key'];
    // if (apiKey !== process.env.PUBLIC_API_KEY) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const data = await getEnhancedNBAData();
    res.json(data.games || data);
  } catch (error) {
    console.error('[PublicNbaDataRoute] Failed to fetch unified NBA data:', error);
    next(error); // Pass to error handling middleware
  }
});

module.exports = router;
