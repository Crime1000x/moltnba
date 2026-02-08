// polysportsclaw-api/src/models/index.js

const NbaMarket = require('./nba_market');
const NbaMarketOutcome = require('./nba_market_outcome');
const NbaPrediction = require('./nba_prediction');
const NbaAgentStats = require('./nba_agent_stats');
const NbaGame = require('./nba_game'); // New: Import NbaGame

module.exports = {
  NbaMarket,
  NbaMarketOutcome,
  NbaPrediction,
  NbaAgentStats,
  NbaGame, // New: Export NbaGame
  // Add other models here if they exist or are created in the future
};
