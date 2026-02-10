// polysportsclaw-api/src/services/NbaMarketService.js
const { queryOne, queryAll } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

class NbaMarketService {
  static async getMarkets(filters = {}, limit = 25, offset = 0) {
    let query = `SELECT * FROM nba_markets`;
    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push(`status = ?`);
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push(`category = ?`);
      params.push(filters.category);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY end_time ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const markets = await queryAll(query, params);
    
    for (const market of markets) {
      market.outcomes = await queryAll(
        `SELECT * FROM nba_market_outcomes WHERE nba_market_id = ? ORDER BY name ASC`,
        [market.id]
      );
    }
    return markets;
  }

  static async getMarketById(id) {
    const market = await queryOne(`SELECT * FROM nba_markets WHERE id = ?`, [id]);
    if (market) {
      market.outcomes = await queryAll(
        `SELECT * FROM nba_market_outcomes WHERE nba_market_id = ? ORDER BY name ASC`,
        [market.id]
      );
    }
    return market;
  }

  static async getMarketBySlug(slug) {
    const market = await queryOne(`SELECT * FROM nba_markets WHERE slug = ?`, [slug]);
    if (market) {
      market.outcomes = await queryAll(
        `SELECT * FROM nba_market_outcomes WHERE nba_market_id = ? ORDER BY name ASC`,
        [market.id]
      );
    }
    return market;
  }
}

module.exports = NbaMarketService;
