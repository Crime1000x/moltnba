require('dotenv').config();
const PolymarketGammaService = require('../src/services/PolymarketGammaService');
const PolymarketDataService = require('../src/services/PolymarketDataService');
// Import pool to close it manually
const { pool } = require('../src/config/database');

async function runSync() {
  console.log('--- Starting Polymarket Sync ---');
  try {
    // 1. Fetch Sports Markets from API
    // Increase limit to find more sports events
    const markets = await PolymarketGammaService.fetchAndFilterSportsMarkets(100);
    
    if (markets.length === 0) {
      console.log('No sports markets found matching criteria.');
    } else {
      console.log(`Fetching detailed data for ${markets.length} markets...`);
      
      // 2. Sync to Database
      const stats = await PolymarketDataService.syncMarkets(markets);
      console.log('Sync Complete:', stats);
    }

  } catch (error) {
    console.error('Sync Fatal Error:', error);
  } finally {
    // Close DB connection if script is standalone
    if (pool) {
        console.log('Closing database pool...');
        await pool.end();
    }
    console.log('--- Sync Finished ---');
    process.exit(0);
  }
}

// Execute
runSync();
