const cron = require('node-cron');
const { queryAll, queryOne } = require('../config/database');

/**
 * NBA 比赛结算任务
 */
async function processNbaResults() {
  console.log('[NBA Settlement] Starting...');
  
  try {
    // 找到已过期但未结算的市场
    const markets = await queryAll(
      `SELECT m.*, 
        (SELECT COUNT(*) FROM nba_predictions WHERE nba_market_id = m.id) as prediction_count
       FROM nba_markets m
       WHERE m.status = 'open' AND m.end_time < NOW()
       LIMIT 10`
    );

    if (markets.length === 0) {
      console.log('[NBA Settlement] No markets to resolve.');
      return;
    }

    console.log(`[NBA Settlement] Found ${markets.length} expired markets.`);

    for (const market of markets) {
      if (market.prediction_count > 0) {
        console.log(`[NBA Settlement] Market "${market.title}" has ${market.prediction_count} predictions, needs resolution.`);
      }
    }
  } catch (error) {
    console.error('[NBA Settlement] Error:', error.message);
  }
}

function startNbaResultProcessor() {
  cron.schedule('*/10 * * * *', processNbaResults);
  console.log('[NBA Settlement] Job scheduled (every 10 minutes).');
}

module.exports = { startNbaResultProcessor, processNbaResults };
