// polysportsclaw-api/src/models/nba_market.js
const NbaMarket = {
  // Database table name
  tableName: 'nba_markets',

  /**
   * Creates a new NBA market.
   * @param {object} marketData - Object containing market data (slug, title, description, category, etc.).
   * @param {object} db - Database client instance.
   * @returns {Promise<object>} The created market object.
   */
  async create(marketData, db) {
    const { slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id } = marketData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id]
    );
    return result.rows[0];
  },

  /**
   * Finds an NBA market by its ID.
   * @param {string} id - The UUID of the market.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The market object or null if not found.
   */
  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Finds an NBA market by its slug.
   * @param {string} slug - The slug of the market.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The market object or null if not found.
   */
  async findBySlug(slug, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE slug = $1`, [slug]);
    return result.rows[0] || null;
  },

  /**
   * Finds all NBA markets with optional filtering and pagination.
   * @param {object} filters - Object containing filters (e.g., status, category).
   * @param {number} limit - Max number of results.
   * @param {number} offset - Number of results to skip.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of market objects.
   */
  async findAll(filters = {}, limit = 25, offset = 0, db) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(filters.category);
    }
    if (filters.market_type) {
      conditions.push(`market_type = $${params.length + 1}`);
      params.push(filters.market_type);
    }
    if (filters.nba_game_id) {
      conditions.push(`nba_game_id = $${params.length + 1}`);
      params.push(filters.nba_game_id);
    }
    // Add other filters as needed

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY end_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Updates an NBA market.
   * @param {string} id - The UUID of the market to update.
   * @param {object} updates - Object containing fields to update.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated market object or null if not found.
   */
  async update(id, updates, db) {
    const setClauses = [];
    const params = [id]; // First parameter is the market ID
    let paramIndex = 2; // Start for update fields

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        // Prevent updating ID
        if (key === 'id') continue;
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id, db); // No updates provided
    }

    params.push(new Date()); // Add updated_at timestamp as the last parameter
    setClauses.push(`updated_at = $${paramIndex}`);

    const result = await db.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  /**
   * Deletes an NBA market by its ID.
   * @param {string} id - The UUID of the market to delete.
   * @param {object} db - Database client instance.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  },
  
  /**
   * Resolves an NBA market.
   * @param {string} marketId - The UUID of the market to resolve.
   * @param {string} resolvedOutcomeId - The UUID of the resolved outcome.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated market object or null if not found.
   */
  async resolveMarket(marketId, resolvedOutcomeId, db) {
    const updates = {
      status: 'resolved',
      resolved_outcome_id: resolvedOutcomeId
    };
    return this.update(marketId, updates, db);
  }
};

module.exports = NbaMarket;
