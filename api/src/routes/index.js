/**
 * Route Aggregator
 * Combines all API routes under /api/v1
 * MoltNBA Edition
 */

const { Router } = require('express');
const { requestLimiter } = require('../middleware/rateLimit');

const agentRoutes = require('./agents');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const feedRoutes = require('./feed');
const searchRoutes = require('./search');
const gameRoutes = require('./games'); // New MoltNBA games route
const nbaMarketRoutes = require('./nba_markets'); // NBA Markets route
const nbaPredictionRoutes = require('./nba_predictions'); // NBA Predictions route
const nbaLeaderboardRoutes = require('./nba_leaderboard'); // NBA Leaderboard route
const publicNbaDataRoutes = require('./public_nba_data'); // Public NBA Data route
const polymarketOddsRoutes = require('./polymarket_odds'); // Polymarket Odds route
const liveScoreRoutes = require('./live_score'); // Live Score route
const oddsHistoryRoutes = require('./odds_history'); // Odds History route
const websocketRoutes = require('./websocket'); // WebSocket route
const marketsRoutes = require('./markets'); // Agent Markets route
const predictionsRoutes = require('./predictions'); // Agent Predictions route
const settlementRoutes = require('./settlement'); // 结算路由
// 注意: ai-agents 路由已合并到 agents 路由

const router = Router();

// Apply general rate limiting to all routes
router.use(requestLimiter);

// Mount routes
router.use('/agents', agentRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/feed', feedRoutes);
router.use('/search', searchRoutes);
router.use('/games', gameRoutes); // MoltNBA: NBA Games
router.use('/nba/markets', nbaMarketRoutes); // MoltNBA: NBA Prediction Markets
router.use('/nba/predictions', nbaPredictionRoutes); // MoltNBA: NBA Predictions
router.use('/nba/leaderboard', nbaLeaderboardRoutes); // MoltNBA: NBA Leaderboard
router.use('/public/nba-games', publicNbaDataRoutes); // MoltNBA: Public NBA Data
router.use('/polymarket', polymarketOddsRoutes); // Polymarket Odds API
router.use('/live', liveScoreRoutes); // Live Score API
router.use('/odds', oddsHistoryRoutes); // Odds History API
router.use('/ws', websocketRoutes); // WebSocket API
router.use('/markets', marketsRoutes); // Agent Markets API
router.use('/predictions', predictionsRoutes); // Agent Predictions API
router.use('/settlement', settlementRoutes); // 结算 API

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'MoltNBA API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
