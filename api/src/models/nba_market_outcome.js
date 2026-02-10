// polysportsclaw-api/src/models/nba_market_outcome.js
const NbaMarketOutcome = {
  tableName: 'nba_market_outcomes',

  async create(outcomeData, db) {
    const { nba_market_id, name, outcome_value } = outcomeData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (nba_market_id, name, outcome_value) VALUES (?, ?, ?)`,
      [nba_market_id, name, outcome_value]
    );
    return { id: result.insertId, ...outcomeData };
  },

  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return result[0] || null;
  },

  async findByMarketId(nbaMarketId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE nba_market_id = ? ORDER BY name ASC`, [nbaMarketId]);
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

    if (setClauses.length === 0) {
      return this.findById(id, db);
    }

    setClauses.push(`updated_at = ?`);
    params.push(new Date());
    params.push(id);

    await db.query(`UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`, params);
    return this.findById(id, db);
  },

  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
};

module.exports = NbaMarketOutcome;
