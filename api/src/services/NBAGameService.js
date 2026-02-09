const { transaction } = require('../config/database'); // Use transaction for consistent DB access
const { NbaGame, NbaMarket } = require('../models'); // Import NbaGame model and NbaMarket
const NbaMarketService = require('./NbaMarketService'); // Import NbaMarketService
const NbaPredictionService = require('./NbaPredictionService'); // Import NbaPredictionService

class NBAGameService {
  /**
   * Upsert a game into the database.
   * Uses NbaGame model's upsert method.
   * @param {object} gameData - Object containing game data from BallDontLie API.
   * @param {object} [dbClient=null] - Optional database client instance for transactions.
   * @returns {Promise<object>} The upserted game object.
   */
  static async upsertGame(gameData, dbClient = null) {
    const useTransaction = !dbClient;
    const db = useTransaction ? await transaction() : dbClient;

    try {
      // Map BallDontLie API game object to NbaGame model schema
      const mappedGameData = {
        balldontlie_id: gameData.id, // Use 'id' from BallDontLie game object
        season: gameData.season,
        game_date: gameData.date ? new Date(gameData.date).toISOString().split('T')[0] : null,
        game_time: gameData.time || gameData.status, // Use time or status as game_time
        status: this.parseStatus(gameData.status, gameData.home_team_score, gameData.period, gameData.postseason),
        home_team_id: gameData.home_team.id,
        home_team_name: gameData.home_team.full_name,
        home_team_abbr: gameData.home_team.abbreviation,
        away_team_id: gameData.visitor_team.id,
        away_team_name: gameData.visitor_team.full_name,
        away_team_abbr: gameData.visitor_team.abbreviation,
        home_score: gameData.home_team_score,
        away_score: gameData.visitor_team_score,
        winner_team_id: this.determineWinnerTeamId(gameData),
      };

      const upsertedGame = await NbaGame.upsert(mappedGameData, db);
      if (useTransaction) await db.commit();
      return upsertedGame;
    } catch (err) {
      if (useTransaction) await db.rollback();
      console.error(`[NBAGameService] Error upserting game ${gameData.id}:`, err.message);
      throw err;
    } finally {
      if (useTransaction) db.release();
    }
  }

  /**
   * Sync multiple games.
   * @param {Array<object>} games - Array of game objects from BallDontLie API.
   * @returns {Promise<{synced: number, errors: number}>} Sync report.
   */
  static async syncGames(games) {
    let synced = 0;
    let errors = 0;

    for (const game of games) {
      try {
        await this.upsertGame(game);
        synced++;
      } catch (err) {
        console.error(`[NBAGameService] Error syncing game ${game.id}:`, err.message);
        errors++;
      }
    }
    return { synced, errors };
  }

  /**
   * Get all upcoming games (scheduled).
   * @returns {Promise<Array>} List of upcoming games.
   */
  static async getUpcomingGames() {
    const db = await transaction();
    try {
      const games = await NbaGame.getUpcoming(db);
      await db.commit();
      return games;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get today's games.
   * @returns {Promise<Array>} List of today's games.
   */
  static async getTodayGames() {
    const db = await transaction();
    try {
      const games = await NbaGame.getToday(db);
      await db.commit();
      return games;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get all games (for display).
   * @param {number} limit - Max number of games to return.
   * @returns {Promise<Array>} List of games.
   */
  static async getAllGames(limit = 50) {
    const db = await transaction();
    try {
      const games = await NbaGame.getAll(limit, db);
      await db.commit();
      return games;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get game by balldontlie ID.
   * @param {number} id - The balldontlie_id of the game.
   * @returns {Promise<object|null>} Game or null.
   */
  static async getGameById(id) {
    const db = await transaction();
    try {
      const game = await NbaGame.findByBalldontlieId(id, db);
      await db.commit();
      return game;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get games needing result update (in_progress or recent scheduled).
   * @returns {Promise<Array>} List of games needing updates.
   */
  static async getGamesNeedingUpdate() {
    const db = await transaction();
    try {
      const games = await NbaGame.getGamesNeedingUpdate(db);
      await db.commit();
      return games;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Resolve NBA prediction markets associated with a completed game.
   * This method should be called once a game's final result is available.
   * @param {number} balldontlieGameId - The balldontlie_id of the completed game.
   * @returns {Promise<Array<object>>} Array of resolved markets.
   */
  static async resolveNbaMarketsForGame(balldontlieGameId) {
    const db = await transaction();
    try {
      const game = await NbaGame.findByBalldontlieId(balldontlieGameId, db);
      if (!game || game.status !== 'final' || !game.winner_team_id) {
        throw new BadRequestError(`Game ${balldontlieGameId} is not final or winner is not determined.`);
      }

      // Find all markets related to this game that are 'open'
      const marketsToResolve = await NbaMarket.findAll({ nba_game_id: balldontlieGameId, status: 'open' }, null, null, db);

      const resolvedMarkets = [];
      for (const market of marketsToResolve) {
        // Determine the winning outcome for this specific market based on game winner
        // This logic needs to be robust for different market types (e.g., Moneyline, Spread, Player Props)
        // For simplicity, let's assume 'game_winner' type for now
        let winningOutcomeValue = null;

        if (market.category === 'game_winner') {
          // For game_winner markets, the winning outcome value is simply the ID of the winning team.
          winningOutcomeValue = game.winner_team_id.toString();
        } else if (market.category === 'total_points') {
            // Placeholder for total points markets
            // Need to compare game.home_score + game.away_score with market threshold
        }
        // ... add logic for other market categories (player props, etc.)

        if (!winningOutcomeValue) {
            console.warn(`[NBAGameService] Could not determine winning outcome for market ${market.id} based on game ${balldontlieGameId}. Skipping resolution.`);
            continue;
        }

        // Fetch outcomes for the market to find the winning_outcome_id
        const marketOutcomes = await NbaMarketOutcome.findByMarketId(market.id, db);
        const actualWinningOutcome = marketOutcomes.find(o => o.outcome_value === winningOutcomeValue);

        if (!actualWinningOutcome) {
            console.error(`[NBAGameService] Winning outcome ${winningOutcomeValue} not found in market outcomes for market ${market.id}.`);
            continue;
        }

        const resolvedMarket = await NbaMarketService.resolveMarket(market.id, actualWinningOutcome.id, db);
        resolvedMarkets.push(resolvedMarket);

        // Update Brier Scores for all predictions on this market
        await NbaPredictionService.updateBrierScoresForMarket(market.id, actualWinningOutcome.id, db);
      }

      await db.commit();
      return resolvedMarkets;
    } catch (error) {
      await db.rollback();
      console.error(`[NBAGameService] Error resolving NBA markets for game ${balldontlieGameId}:`, error.message);
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Parses game status from BallDontLie API string and scores.
   * @param {string} statusStr - Status string from API (e.g., "Final", "1st Qtr").
   * @param {number} homeScore - Home team score.
   * @param {number} period - Current period.
   * @param {boolean} postseason - Is it a postseason game.
   * @returns {string} Standardized status ('scheduled', 'in_progress', 'final', 'postponed').
   */
  static parseStatus(statusStr, homeScore, period, postseason) {
    if (!statusStr) return 'scheduled'; // Default if no status
    if (statusStr.includes('Final')) return 'final';
    if (statusStr.includes('Postponed')) return 'postponed';
    if (period && period >= 1 && statusStr !== 'Final') return 'in_progress';
    if (homeScore !== null && homeScore > 0 && statusStr !== 'Final') return 'in_progress'; // If scores exist, game is likely in progress
    return 'scheduled';
  }

  /**
   * Determines the winner team ID from game data.
   * @param {object} gameData - Game object from BallDontLie API.
   * @returns {number|null} The balldontlie team ID of the winner, or null if not determined.
   */
  static determineWinnerTeamId(gameData) {
    if (this.parseStatus(gameData.status, gameData.home_team_score, gameData.period, gameData.postseason) !== 'final') {
      return null;
    }
    if (gameData.home_team_score > gameData.visitor_team_score) {
      return gameData.home_team.id;
    } else if (gameData.visitor_team_score > gameData.home_team_score) {
      return gameData.visitor_team.id;
    }
    return null; // Tie (unlikely in NBA but good to handle)
  }
}

module.exports = NBAGameService;
