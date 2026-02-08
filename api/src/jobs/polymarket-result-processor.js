const cron = require('node-cron');
const PolymarketDataService = require('../services/PolymarketDataService');
const PolymarketGammaService = require('../services/PolymarketGammaService'); // To fetch final market details
const PredictionService = require('../services/PredictionService'); // To update predictions
const LeaderboardService = require('../services/LeaderboardService'); // Will be created in Task 10
const config = require('../config');

/**
 * Processes resolved Polymarket markets, updates predictions, and agent stats.
 */
async function processResolvedMarkets() {
  console.log('Processing resolved Polymarket markets...');
  try {
    // 1. Find markets that should be resolved (end_time passed, status not resolved/canceled)
    const marketsToResolve = await PolymarketDataService.getMarketsByStatusAndEndTime({
      status: ['open', 'in_progress'],
      endTimeBefore: new Date(),
    });

    if (marketsToResolve.length === 0) {
      console.log('No markets to resolve at this time.');
      return;
    }

    for (const market of marketsToResolve) {
      console.log(`Attempting to resolve market: ${market.market_id}`);
      let winningOutcomeId = null;
      let marketStatus = 'resolved'; // Default to resolved

      try {
        // 2. Fetch the final market details from Polymarket Gamma API to get the winning outcome
        // This assumes PolymarketGammaService has a method to fetch a single market by ID
        // and that resolved markets return a winningOutcomeId.
        const polymarketMarketDetails = await PolymarketGammaService.getMarketById(market.market_id);
        
        if (polymarketMarketDetails && polymarketMarketDetails.status === 'resolved' && polymarketMarketDetails.winningOutcomeId) {
          winningOutcomeId = polymarketMarketDetails.winningOutcomeId;
        } else if (polymarketMarketDetails && polymarketMarketDetails.status === 'canceled') {
          marketStatus = 'canceled';
          console.warn(`Market ${market.market_id} was canceled on Polymarket.`);
        } else {
          console.warn(`Market ${market.market_id} is not yet resolved or winning outcome not available from Polymarket. Skipping for now.`);
          continue; // Skip if Polymarket hasn't marked it resolved or provided winning outcome
        }
      } catch (apiError) {
        console.error(`Error fetching final details for market ${market.market_id} from Polymarket API:`, apiError.message);
        continue; // Skip this market if API call fails
      }

      // 3. Update market status and winning outcome in our DB
      const updatedMarket = await PolymarketDataService.updateMarketStatus(
        market.market_id,
        marketStatus,
        winningOutcomeId
      );
      console.log(`Market ${market.market_id} updated to status: ${marketStatus}, winning outcome: ${winningOutcomeId}`);

      // Only process predictions if market is resolved with a winning outcome
      if (marketStatus === 'resolved' && winningOutcomeId) {
        // 4. Get all predictions for this market
        const predictions = await PredictionService.getPredictionsByMarketId(market.market_id);
        console.log(`Found ${predictions.length} predictions for market ${market.market_id}.`);

        for (const prediction of predictions) {
          const isCorrect = prediction.predicted_outcome_id === winningOutcomeId;
          await PredictionService.updatePredictionResult(prediction.id, isCorrect);
          console.log(`Prediction ${prediction.id} for agent ${prediction.agent_id} is ${isCorrect ? 'CORRECT' : 'INCORRECT'}.`);

          // 5. Update agent stats (LeaderboardService functionality - Task 10)
          await LeaderboardService.updateAgentStats(prediction.agent_id, isCorrect);
        }
      } else if (marketStatus === 'canceled') {
          // If canceled, predictions are neither correct nor incorrect, just update stats without scoring
          const predictions = await PredictionService.getPredictionsByMarketId(market.market_id);
          for (const prediction of predictions) {
              await LeaderboardService.updateAgentStatsForCanceledMarket(prediction.agent_id);
          }
      }
    }
  } catch (error) {
    console.error('Error in processResolvedMarkets:', error);
  }
}

/**
 * Initializes and starts the Polymarket result processing job.
 */
function startPolymarketResultProcessor() {
  // Schedule job to run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running Polymarket result processing job...');
    await processResolvedMarkets();
  });

  console.log('Polymarket result processor job started.');
}

module.exports = {
  startPolymarketResultProcessor,
  processResolvedMarkets, // Export for manual trigger/testing
};
