// polysportsclaw-api/src/models/nba_prediction.js
const NbaPrediction = {
  // Database table name
  tableName: 'nba_predictions',

  /**
   * Creates a new NBA prediction.
   * @param {object} predictionData - Object containing prediction data (agent_id, nba_market_id, predicted_outcome_id, p_value, rationale).
   * @param {object} db - Database client instance.
   * @returns {Promise<object>} The created prediction object.
   */
  async create(predictionData, db) {
    const { agent_id, nba_market_id, predicted_outcome_id, p_value, rationale } = predictionData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (agent_id, nba_market_id, predicted_outcome_id, p_value, rationale)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [agent_id, nba_market_id, predicted_outcome_id, p_value, rationale]
    );
    return result.rows[0];
  },

  /**
   * Finds an NBA prediction by its ID.
   * @param {string} id - The UUID of the prediction.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The prediction object or null if not found.
   */
  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Finds all NBA predictions for a given market ID.
   * @param {string} nbaMarketId - The UUID of the NBA market.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of prediction objects.
   */
  async findByMarketId(nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE nba_market_id = $1 ORDER BY created_at DESC`, [nbaMarketId]);
    return result.rows;
  },

  /**
   * Finds an NBA prediction by agent ID and market ID.
   * @param {string} agentId - The UUID of the agent.
   * @param {string} nbaMarketId - The UUID of the NBA market.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The prediction object or null if not found.
   */
   async findByAgentAndMarket(agentId, nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = $1 AND nba_market_id = $2`, [agentId, nbaMarketId]);
    return result.rows[0] || null;
  },

  /**
   * Finds all NBA predictions for a given agent ID.
   * @param {string} agentId - The UUID of the agent.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of prediction objects.
   */
  async findByAgentId(agentId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = $1 ORDER BY created_at DESC`, [agentId]);
    return result.rows;
  },

  /**
   * Updates an NBA prediction.
   * @param {string} id - The UUID of the prediction to update.
   * @param {object} updates - Object containing fields to update.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated prediction object or null if not found.
   */
  async update(id, updates, db) {
    const setClauses = [];
    const params = [id]; // First parameter is the prediction ID
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
   * Updates the brier score for a given prediction.
   * @param {string} id - The UUID of the prediction.
   * @param {number} brierScore - The calculated Brier score.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated prediction object or null if not found.
   */
  async updateBrierScore(id, brierScore, db) {
    const updates = { brier_score: brierScore };
    return this.update(id, updates, db);
  },

  /**
   * Deletes an NBA prediction by its ID.
   * @param {string} id - The UUID of the prediction to delete.
   * @param {object} db - Database client instance.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }
};

module.exports = NbaPrediction;
