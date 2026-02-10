// polysportsclaw-api/src/models/nba_game.js
const NbaGame = {
  tableName: 'nba_games',

  async upsert(gameData, db) {
    const {
      balldontlie_id, season, game_date, game_time, status,
      home_team_id, home_team_name, home_team_abbr,
      away_team_id, away_team_name, away_team_abbr,
      home_score, away_score, winner_team_id
    } = gameData;

    // MySQL: INSERT ... ON DUPLICATE KEY UPDATE
    await db.query(
      `INSERT INTO ${this.tableName} (
         balldontlie_id, season, game_date, game_time, status,
         home_team_id, home_team_name, home_team_abbr,
         away_team_id, away_team_name, away_team_abbr,
         home_score, away_score, winner_team_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         season = VALUES(season),
         game_date = VALUES(game_date),
         game_time = VALUES(game_time),
         status = VALUES(status),
         home_team_id = VALUES(home_team_id),
         home_team_name = VALUES(home_team_name),
         home_team_abbr = VALUES(home_team_abbr),
         away_team_id = VALUES(away_team_id),
         away_team_name = VALUES(away_team_name),
         away_team_abbr = VALUES(away_team_abbr),
         home_score = VALUES(home_score),
         away_score = VALUES(away_score),
         winner_team_id = VALUES(winner_team_id),
         updated_at = NOW()`,
      [
        balldontlie_id, season, game_date, game_time, status,
        home_team_id, home_team_name, home_team_abbr,
        away_team_id, away_team_name, away_team_abbr,
        home_score, away_score, winner_team_id
      ]
    );
    return this.findByBalldontlieId(balldontlie_id, db);
  },

  async findByBalldontlieId(id, db) {
    const result = await db.query(`SELECT * FROM ${this.tableName} WHERE balldontlie_id = ?`, [id]);
    return result[0] || null;
  },

  async getUpcoming(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'scheduled' AND game_date >= CURDATE()
       ORDER BY game_date ASC, game_time ASC`
    );
    return result;
  },

  async getToday(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE game_date = CURDATE()
       ORDER BY game_time ASC`
    );
    return result;
  },

  async getAll(limit = 50, db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       ORDER BY game_date DESC, game_time ASC
       LIMIT ?`,
      [limit]
    );
    return result;
  },

  async getGamesNeedingUpdate(db) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName}
       WHERE status IN ('scheduled', 'in_progress')
         AND game_date <= CURDATE()
       ORDER BY game_date DESC`
    );
    return result;
  }
};

module.exports = NbaGame;
