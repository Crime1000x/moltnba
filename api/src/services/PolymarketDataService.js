const { queryOne, queryAll } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class PolymarketDataService {
  /**
   * Syncs a list of markets from Gamma API to the database.
   * Maps Gamma API 'event' structure to our 'polymarket_events' table.
   *
   * @param {Array} events - List of event objects from PolymarketGammaService.
   * @returns {Promise<Object>} Stats { synced: number, errors: number }
   */
  static async syncMarkets(events) {
    let synced = 0;
    let errors = 0;

    for (const event of events) {
      try {
        await this.upsertEvent(event);
        synced++;
      } catch (err) {
        console.error(`[PolymarketDataService] Error syncing event ${event.id}:`, err.message);
        errors++;
      }
    }
    return { synced, errors };
  }

  /**
   * Upserts a single event into 'polymarket_events'.
   * 
   * @param {Object} event - Gamma API event object.
   */
  static async upsertEvent(event) {
    // Determine category from tags or fallback
    let category = 'Sports'; 
    if (event.tags && event.tags.length > 0) {
        const sportTags = event.tags.map(t => t.label || t.slug);
        const mainTag = sportTags.find(t => ['NBA', 'NFL', 'Soccer', 'UFC', 'Tennis'].includes(t));
        if (mainTag) category = mainTag;
    }

    let status = 'active';
    if (event.closed) status = 'closed';
    
    const marketUrl = `https://polymarket.com/event/${event.slug}`;

    // MySQL syntax: INSERT ... ON DUPLICATE KEY UPDATE
    const query = `
      INSERT INTO polymarket_events (
        polymarket_id,
        title,
        description,
        category,
        status,
        market_url,
        starts_at,
        ends_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        status = VALUES(status),
        market_url = VALUES(market_url),
        starts_at = VALUES(starts_at),
        ends_at = VALUES(ends_at),
        updated_at = NOW()
    `;

    // Ensure dates are in correct format or null
    // MySQL handles ISO strings well usually, but check for nulls
    const startsAt = event.startDate ? new Date(event.startDate) : null;
    const endsAt = event.endDate ? new Date(event.endDate) : null;

    const values = [
      event.id,                 // polymarket_id
      event.title,              // title
      event.description,        // description
      category,                 // category
      status,                   // status
      marketUrl,                // market_url
      startsAt,                 // starts_at
      endsAt                    // ends_at
    ];

    // queryOne uses result.rows[0], but for INSERT in MySQL we might not get rows back unless we SELECT.
    // However, our sync logic just needs completion. 
    return queryOne(query, values);
  }

  /**
   * Get all active markets from DB.
   */
  static async getActiveMarkets() {
    return queryAll(`SELECT * FROM polymarket_markets WHERE status = 'open' ORDER BY created_at DESC`);
  }

  /**
   * Get market by Polymarket ID.
   */
  static async getMarketByPolymarketId(polymarketId) {
    return queryOne(`SELECT * FROM polymarket_markets WHERE market_id = ?`, [polymarketId]);
  }

  /**
   * Get markets by status and end time (for result processing).
   */
  static async getMarketsByStatusAndEndTime({ status = [], endTimeBefore = null } = {}) {
    let query = `SELECT * FROM polymarket_markets WHERE 1=1`;
    const params = [];

    if (status && status.length > 0) {
      const placeholders = status.map(() => '?').join(', ');
      query += ` AND status IN (${placeholders})`;
      params.push(...status);
    }

    if (endTimeBefore) {
      query += ` AND end_time IS NOT NULL AND end_time < ?`;
      params.push(endTimeBefore);
    }

    query += ` ORDER BY end_time ASC`;

    return queryAll(query, params);
  }
}

module.exports = PolymarketDataService;
