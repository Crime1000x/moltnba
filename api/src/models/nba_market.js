// polysportsclaw-api/src/models/nba_market.js
const NbaMarket = {
  tableName: 'nba_markets',

  async create(marketData, db) {
    const { slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id } = marketData;
    const result = await db.query(
      `INSERT INTO ${this.tableName} (slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, description, category, market_type, status, start_time, end_time, nba_game_id, home_team_id, away_team_id, player_id]
    );
    return { id: result.insertId, ...marketData };
  },

  async findById(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return result[0] || null;
  },

  async findBySlug(slug, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE slug = ?`, [slug]);
    return result[0] || null;
  },

  async findAll(filters = {}, limit = 25, offset = 0, db) {
    let query = `SELECT * FROM ${this.tableName}`;
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
    if (filters.market_type) {
      conditions.push(`market_type = ?`);
      params.push(filters.market_type);
    }
    if (filters.nba_game_id) {
      conditions.push(`nba_game_id = ?`);
      params.push(filters.nba_game_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY end_time ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
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

    await db.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
    return this.findById(id, db);
  },

  async delete(id, db) {
    const result = await db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async resolveMarket(marketId, resolvedOutcomeId, db) {
    return this.update(marketId, { status: 'resolved', resolved_outcome_id: resolvedOutcomeId }, db);
  }
};

module.exports = NbaMarket;
