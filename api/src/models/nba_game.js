// polysportsclaw-api/src/models/nba_game.js
const NbaGame = {
  // Database table name
  tableName: 'nba_games',

  /**
   * Inserts a new NBA game or updates an existing one if a conflict on balldontlie_id occurs.
   * @param {object} gameData - Object containing game data.
   * @param {object} db - Database client instance.
   * @returns {Promise<object>} The upserted game object.
   */
  async upsert(gameData, db) {
    const {
      balldontlie_id, season, game_date, game_time, status,
      home_team_id, home_team_name, home_team_abbr,
      away_team_id, away_team_name, away_team_abbr,
      home_score, away_score, winner_team_id
    } = gameData;

    const result = await db.query(
      `INSERT INTO ${this.tableName} (
         balldontlie_id, season, game_date, game_time, status,
         home_team_id, home_team_name, home_team_abbr,
         away_team_id, away_team_name, away_team_abbr,
         home_score, away_score, winner_team_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (balldontlie_id) DO UPDATE SET
         season = EXCLUDED.season,
         game_date = EXCLUDED.game_date,
         game_time = EXCLUDED.game_time,
         status = EXCLUDED.status,
         home_team_id = EXCLUDED.home_team_id,
         home_team_name = EXCLUDED.home_team_name,
         home_team_abbr = EXCLUDED.home_team_abbr,
         away_team_id = EXCLUDED.away_team_id,
         away_team_name = EXCLUDED.away_team_name,
         away_team_abbr = EXCLUDED.away_team_abbr,
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         winner_team_id = EXCLUDED.winner_team_id,
         updated_at = NOW()
       RETURNING *`,
      [
        balldontlie_id, season, game_date, game_time, status,
        home_team_id, home_team_name, home_team_abbr,
        away_team_id, away_team_name, away_team_abbr,
        home_score, away_score, winner_team_id
      ]
    );
    return result.rows[0];
  },

  /**
   * Finds an NBA game by its balldontlie ID.
   * @param {number} id - The balldontlie_id of the game.
   * @param {object} db - Database client instance.
   * @returns {Promise<object|null>} The game object or null if not found.
   */
  async findByBalldontlieId(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE balldontlie_id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Gets all upcoming NBA games.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of upcoming game objects.
   */
  async getUpcoming(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'scheduled' AND game_date >= CURRENT_DATE
       ORDER BY game_date ASC, game_time ASC`
    );
    return result.rows;
  },

  /**
   * Gets all NBA games for today.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of today's game objects.
   */
  async getToday(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE game_date = CURRENT_DATE
       ORDER BY game_time ASC`
    );
    return result.rows;
  },

  /**
   * Gets all NBA games with optional limit.
   * @param {number} limit - Max number of games to return.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of game objects.
   */
  async getAll(limit = 50, db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       ORDER BY game_date DESC, game_time ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  /**
   * Gets games that need results updated (in_progress or recently scheduled/final).
   * This logic might need refinement based on balldontlie.io API polling strategy.
   * @param {object} db - Database client instance.
   * @returns {Promise<object[]>} An array of game objects needing updates.
   */
  async getGamesNeedingUpdate(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE status IN ('scheduled', 'in_progress')
         AND game_date <= CURRENT_DATE
       ORDER BY game_date DESC`
    );
    return result.rows;
  }
};

module.exports = NbaGame;
