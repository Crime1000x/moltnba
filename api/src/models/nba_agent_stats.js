// polysportsclaw-api/src/models/nba_agent_stats.js
const NbaAgentStats = {
  // Database table name
  tableName: 'nba_agent_stats',

  /**
   * Initializes agent stats if not exists.
   * @param {string} agentId - The UUID of the agent.
   * @param {object} db - Database client instance.
   * @returns {Promise<object>} The agent stats object (newly created or existing).
   */
  async findOrCreate(agentId, db) {
    let stats = await this.findByAgentId(agentId, db);
    if (!stats) {
      const result = await db.query(
        `INSERT INTO ${this.tableName} (agent_id) VALUES ($1) RETURNING *`,
        [agentId]
      );
      stats = result.rows[0];
    }
    return stats;
  },

  /**
   * Finds NBA agent stats by agent ID.
   * @param {string} agentId - The UUID of the agent.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The agent stats object or null if not found.
   */
  async findByAgentId(agentId, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE agent_id = $1`, [agentId]);
    return result.rows[0] || null;
  },

  /**
   * Updates NBA agent stats.
   * @param {string} agentId - The UUID of the agent to update.
   * @param {object} updates - Object containing fields to update.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The updated agent stats object or null if not found.
   */
  async update(agentId, updates, db) {
    const setClauses = [];
    const params = [agentId]; // First parameter is the agent ID
    let paramIndex = 2; // Start for update fields

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === 'agent_id') continue;
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.findByAgentId(agentId, db);
    }

    params.push(new Date()); // Add updated_at timestamp
    setClauses.push(`updated_at = $${paramIndex}`);

    const result = await db.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE agent_id = $1 RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  /**
   * Gets a list of NBA agent stats for the leaderboard.
   * @param {number} limit - Max number of results.
   * @param {number} offset - Number of results to skip.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of agent stats objects.
   */
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
       WHERE nba_agent_stats.resolved_nba_predictions > 0 -- Only agents with resolved predictions
       ORDER BY nba_agent_stats.average_brier_score ASC, nba_agent_stats.resolved_nba_predictions DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
};

module.exports = NbaAgentStats;
