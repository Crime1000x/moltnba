// polysportsclaw-api/src/services/NbaMarketService.js
const { queryOne, queryAll, transaction } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { NbaMarket, NbaMarketOutcome } = require('../models'); // Assuming models are exported from index.js

class NbaMarketService {
  /**
   * Get all NBA prediction markets.
   * @param {object} filters - Filters for markets (e.g., status, category).
   * @param {number} limit - Number of markets to return.
   * @param {number} offset - Number of markets to skip.
   * @returns {Promise<object[]>} An array of NBA market objects.
   */
  static async getMarkets(filters = {}, limit = 25, offset = 0) {
    const db = await transaction(); // Acquire a client from the pool
    try {
      const markets = await NbaMarket.findAll(filters, limit, offset, db);
      // For each market, fetch its outcomes
      for (const market of markets) {
        market.outcomes = await NbaMarketOutcome.findByMarketId(market.id, db);
      }
      await db.commit();
      return markets;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release(); // Release the client back to the pool
    }
  }

  /**
   * Get a single NBA market by ID.
   * @param {string} id - The UUID of the market.
   * @returns {Promise<object|null>} The NBA market object or null if not found.
   */
  static async getMarketById(id) {
    const db = await transaction();
    try {
      const market = await NbaMarket.findById(id, db);
      if (market) {
        market.outcomes = await NbaMarketOutcome.findByMarketId(market.id, db);
      }
      await db.commit();
      return market;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Get a single NBA market by slug.
   * @param {string} slug - The slug of the market.
   * @returns {Promise<object|null>} The NBA market object or null if not found.
   */
  static async getMarketBySlug(slug) {
    const db = await transaction();
    try {
      const market = await NbaMarket.findBySlug(slug, db);
      if (market) {
        market.outcomes = await NbaMarketOutcome.findByMarketId(market.id, db);
      }
      await db.commit();
      return market;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Create a new NBA market and its outcomes.
   * @param {object} marketData - Market details.
   * @param {Array<object>} outcomesData - Array of outcome objects { name, outcome_value }.
   * @returns {Promise<object>} The created NBA market object with outcomes.
   */
  static async createMarket(marketData, outcomesData) {
    const db = await transaction();
    try {
      // Check if market slug already exists
      const existingMarket = await NbaMarket.findBySlug(marketData.slug, db);
      if (existingMarket) {
        throw new ConflictError(`Market with slug '${marketData.slug}' already exists.`);
      }

      // If it's a game_winner market and game IDs are provided, automatically generate outcomes
      if (marketData.category === 'game_winner' && marketData.nba_game_id && marketData.home_team_id && marketData.away_team_id) {
        // Clear any provided outcomesData as we will generate them
        outcomesData = [
          { name: marketData.home_team_name || `Team ${marketData.home_team_id} Wins`, outcome_value: marketData.home_team_id.toString() },
          { name: marketData.away_team_name || `Team ${marketData.away_team_id} Wins`, outcome_value: marketData.away_team_id.toString() },
        ];
      } else if (!outcomesData || outcomesData.length < 2) {
        throw new BadRequestError('Markets must have at least two outcomes.');
      }

      const market = await NbaMarket.create(marketData, db);
      const createdOutcomes = [];

      for (const outcome of outcomesData) {
        const newOutcome = await NbaMarketOutcome.create({
          nba_market_id: market.id,
          name: outcome.name,
          outcome_value: outcome.outcome_value,
        }, db);
        createdOutcomes.push(newOutcome);
      }

      market.outcomes = createdOutcomes;
      await db.commit();
      return market;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  /**
   * Resolve an NBA market with a winning outcome.
   * @param {string} marketId - The ID of the market to resolve.
   * @param {string} winningOutcomeValue - The outcome_value of the winning outcome.
   * @returns {Promise<object>} The resolved NBA market object.
   */
  static async resolveMarket(marketId, winningOutcomeValue) {
    const db = await transaction();
    try {
      const market = await NbaMarket.findById(marketId, db);
      if (!market) {
        throw new NotFoundError(`NBA Market with ID ${marketId} not found.`);
      }
      if (market.status !== 'closed' && market.status !== 'open') { // Can only resolve open or closed markets
        throw new BadRequestError(`Market ${marketId} is already ${market.status}. Cannot resolve.`);
      }

      const outcomes = await NbaMarketOutcome.findByMarketId(marketId, db);
      const winningOutcome = outcomes.find(o => o.outcome_value === winningOutcomeValue);

      if (!winningOutcome) {
        throw new BadRequestError(`Winning outcome value '${winningOutcomeValue}' not found for market ${marketId}.`);
      }

      const resolvedMarket = await NbaMarket.resolveMarket(marketId, winningOutcome.id, db);
      resolvedMarket.outcomes = outcomes; // Attach outcomes for full response
      await db.commit();
      return resolvedMarket;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }
  
  // Add other methods like updateMarket, deleteMarket if needed
}

module.exports = NbaMarketService;
