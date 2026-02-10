// polysportsclaw-api/src/models/nba_agent_stats.js
const NbaAgentStats = {
  tableName: 'nba_agent_stats',

  async findOrCreate(agentId, db) {
    let stats = await this.findByAgentId(agentId, db);
    if (!stats) {
      await db.query(`INSERT INTO ${this.tableName} (agent_id) VALUES (?)`, [agentId]);
      stats = await this.findByAgentId(agentId, db);
    }
    return stats;
  },

  async findByAgentId(agentId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = ?`, [agentId]);
    return result[0] || null;
  },

  async update(agentId, updates, db) {
    const setClauses = [];
    const params = [];

    for (const key in updates) {
      if (updates.hasOwnProperty(key) && key !== 'agent_id') {
        setClauses.push(`${key} = ?`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return this.findByAgentId(agentId, db);

    setClauses.push(`updated_at = ?`);
    params.push(new Date());
    params.push(agentId);

    await db.query(`UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE agent_id = ?`, params);
    return this.findByAgentId(agentId, db);
  },

  async getLeaderboard(limit = 10, offset = 0, db) {
    const result = await db.query(
      `SELECT
         nba_agent_stats.agent_id,
         agents.name AS agent_name,
         agents.display_name AS agent_display_name,
         nba_agent_stats.total_nba_predictions,
         nba_agent_stats.resolved_nba_predictions,
         nba_agent_stats.average_brier_score
       FROM ${this.tableName}
       JOIN agents ON nba_agent_stats.agent_id = agents.id
       WHERE nba_agent_stats.resolved_nba_predictions > 0
       ORDER BY nba_agent_stats.average_brier_score ASC, nba_agent_stats.resolved_nba_predictions DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return result;
  }
};

module.exports = NbaAgentStats;
