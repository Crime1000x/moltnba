require('dotenv').config();
const BallDontLieService = require('../src/services/BallDontLieService');
const NBAGameService = require('../src/services/NBAGameService');
const { closePool } = require('../src/config/database');

async function runSync() {
  console.log('--- Starting MoltNBA Game Sync ---');
  try {
    // Generate dates for next 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    console.log(`Fetching games for dates: ${dates.join(', ')}`);

    // 1. Fetch upcoming games from BallDontLie API
    // The service returns { data: [...games], meta: ... }
    const response = await BallDontLieService.getGames({ dates });
    const games = response.data;
    
    if (!games || games.length === 0) {
      console.log('No games found for the next 7 days.');
    } else {
      console.log(`Fetched ${games.length} games. Syncing to database...`);
      
      // 2. Sync to Database
      const stats = await NBAGameService.syncGames(games);
      console.log('Sync Complete:', stats);
    }

  } catch (error) {
    console.error('Sync Fatal Error:', error);
  } finally {
    await closePool();
    console.log('--- Sync Finished ---');
    process.exit(0);
  }
}

// Execute
runSync();
