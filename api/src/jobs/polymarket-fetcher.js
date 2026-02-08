const cron = require('node-cron');
const PolymarketGammaService = require('../services/PolymarketGammaService');
const PolymarketDataService = require('../services/PolymarketDataService');
const PolymarketWebSocketService = require('../services/PolymarketWebSocketService');
const PostService = require('../services/PostService'); // Will be used in Task 7
const config = require('../config');

let polymarketWsService;

/**
 * Fetches markets from Polymarket Gamma API, processes them, and subscribes to WebSocket updates.
 */
async function fetchAndProcessMarkets() {
  console.log('Fetching and processing Polymarket markets...');
  try {
    const markets = await PolymarketGammaService.fetchAndFilterSportsMarkets();
    console.log(`Found ${markets.length} filtered Polymarket markets.`);

    for (const market of markets) {
      // Check if market already exists in DB
      const existingMarket = await PolymarketDataService.getMarketById(market.id);

      // Save/Update market data in DB
      const savedMarket = await PolymarketDataService.saveMarket({
        id: market.id,
        question: market.question,
        category: market.category,
        type: market.type, // Assuming 'type' is available from Gamma API, e.g., 'moneyline'
        status: market.status,
        startTime: market.startTime, // Assuming startTime/endTime are available
        endTime: market.endTime,     // Assuming startTime/endTime are available
        outcomes: market.outcomes,
      });
      console.log(`Market saved/updated: ${savedMarket.market_id}`);

      // Subscribe to WebSocket updates for this market
      polymarketWsService.subscribeToMarket(market.id);

      // If it's a new market, trigger post creation (Task 7 will implement this)
      if (!existingMarket) {
        console.log(`New market detected: ${market.id}. Triggering post creation...`);
        const newPost = await PostService.createPolymarketPost(config.polysportsclaw.adminAgentId, market); // Use original 'market' object
        // Update the polymarket_markets table with the post_id
        await PolymarketDataService.updateMarketPostId(market.id, newPost.id);
      }
    }
  } catch (error) {
    console.error('Error in fetchAndProcessMarkets:', error);
  }
}

/**
 * Initializes and starts the hourly Polymarket market fetching job and WebSocket client.
 */
function startPolymarketFetcher() {
  // 检查是否启用 Polymarket 功能
  const enablePolymarket = process.env.ENABLE_POLYMARKET_WS === 'true';

  if (!enablePolymarket) {
    console.log('Polymarket WebSocket disabled (set ENABLE_POLYMARKET_WS=true to enable).');
    return;
  }

  if (!config.polymarket || !config.polymarket.gammaApiUrl || !config.polymarket.websocketApiUrl) {
    console.warn('Polymarket API configuration missing. Polymarket fetcher will not start.');
    return;
  }

  // Initialize WebSocket Service
  polymarketWsService = new PolymarketWebSocketService();

  polymarketWsService.on('connected', () => {
    console.log('Polymarket WebSocket service connected. Initializing market fetch...');
    // Perform initial fetch immediately on connection
    fetchAndProcessMarkets();
  });

  polymarketWsService.on('probabilityUpdate', async (marketId, outcomeId, probability) => {
    try {
      await PolymarketDataService.updateProbability(marketId, outcomeId, probability);
      console.log(`Updated probability for Market ${marketId}, Outcome ${outcomeId}: ${probability}`);
    } catch (error) {
      console.error(`Error updating probability for Market ${marketId}, Outcome ${outcomeId}:`, error);
    }
  });

  polymarketWsService.on('marketStatusUpdate', async (marketId, status, startTime, endTime) => {
    try {
      // Update market status in DB. If status is 'resolved', winningOutcomeId will be updated by a separate job (Task 9)
      await PolymarketDataService.updateMarketStatus(marketId, status, null); // winningOutcomeId is null here, updated by Task 9
      console.log(`Updated status for Market ${marketId}: ${status}`);
      // Re-fetch to get potential new data after status change or manage specific status transitions
      if (status === 'resolved' || status === 'canceled') {
        // Unsubscribe from resolved/canceled markets
        polymarketWsService.unsubscribeFromMarket(marketId);
        console.log(`Unsubscribed from market ${marketId} due to status: ${status}`);
      }
    } catch (error) {
      console.error(`Error updating status for Market ${marketId}:`, error);
    }
  });


  // Connect WebSocket
  polymarketWsService.connect();

  // Schedule hourly job
  cron.schedule('0 * * * *', async () => { // Runs at the top of every hour
    console.log('Running hourly Polymarket market fetch job...');
    await fetchAndProcessMarkets();
  });

  console.log('Polymarket market fetcher and WebSocket client started.');
}

module.exports = {
  startPolymarketFetcher,
  fetchAndProcessMarkets, // Export for manual trigger/testing
};
