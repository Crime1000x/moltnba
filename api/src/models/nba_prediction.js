// polysportsclaw-api/src/models/nba_prediction.js
const NbaPrediction = {
  tableName: 'nba_predictions',

  async create(predictionData, db) {
    const { agent_id, nba_market_id, predicted_outcome_id, p_value, rationale } = predictionData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (agent_id, nba_market_id, predicted_outcome_id, p_value, rationale) VALUES (?, ?, ?, ?, ?)`,
      [agent_id, nba_market_id, predicted_outcome_id, p_value, rationale]
    );
    return { id: result.insertId, ...predictionData };
  },

  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return result[0] || null;
  },

  async findByMarketId(nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE nba_market_id = ? ORDER BY created_at DESC`, [nbaMarketId]);
    return result;
  },

  async findByAgentAndMarket(agentId, nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = ? AND nba_market_id = ?`, [agentId, nbaMarketId]);
    return result[0] || null;
  },

  async findByAgentId(agentId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = ? ORDER BY created_at DESC`, [agentId]);
    return result;
  },

  async update(id, updates, db) {
    const setClauses = [];
    const params = [];

    for (const key in updates) {
      if (updates.hasOwnProperty(key) && key !== 'id') {
        setClauses.push(`${key} = ?`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return this.findById(id, db);

    setClauses.push(`updated_at = ?`);
    params.push(new Date());
    params.push(id);

    await db.query(`UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`, params);
    return this.findById(id, db);
  },

  async updateBrierScore(id, brierScore, db) {
    return this.update(id, { brier_score: brierScore }, db);
  },

  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
};

module.exports = NbaPrediction;
