// polysportsclaw-api/src/models/nba_market_outcome.js
const NbaMarketOutcome = {
  // Database table name
  tableName: 'nba_market_outcomes',

  /**
   * Creates a new NBA market outcome.
   * @param {object} outcomeData - Object containing outcome data (nba_market_id, name, outcome_value).
   * @param {object} db - Database client instance.
   * @returns {Promise<object>} The created outcome object.
   */
  async create(outcomeData, db) {
    const { nba_market_id, name, outcome_value } = outcomeData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (nba_market_id, name, outcome_value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nba_market_id, name, outcome_value]
    );
    return result.rows[0];
  },

  /**
   * Finds an NBA market outcome by its ID.
   * @param {string} id - The UUID of the outcome.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The outcome object or null if not found.
   */
  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Finds all NBA market outcomes for a given market ID.
   * @param {string} nbaMarketId - The UUID of the NBA market.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of outcome objects.
   */
  async findByMarketId(nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE nba_market_id = $1 ORDER BY name ASC`, [nbaMarketId]);
    return result.rows;
  },

  /**
   * Updates an NBA market outcome.
   * @param {string} id - The UUID of the outcome to update.
   * @param {object} updates - Object containing fields to update.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated outcome object or null if not found.
   */
  async update(id, updates, db) {
    const setClauses = [];
    const params = [id]; // First parameter is the outcome ID
    let paramIndex = 2; // Start for update fields

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === 'id') continue;
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id, db);
    }

    params.push(new Date()); // Add updated_at timestamp
    setClauses.push(`updated_at = $${paramIndex}`);

    const result = await db.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  /**
   * Deletes an NBA market outcome by its ID.
   * @param {string} id - The UUID of the outcome to delete.
   * @param {object} db - Database client instance.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }
};

module.exports = NbaMarketOutcome;
