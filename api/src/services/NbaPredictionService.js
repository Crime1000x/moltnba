// polysportsclaw-api/src/services/NbaPredictionService.js
const { queryOne, queryAll } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

class NbaPredictionService {
  static async createPrediction(data) {
    const { agent_id, nba_market_id, predicted_outcome_id, p_value, rationale } = data;
    
    // Validate market exists and is open
    const market = await queryOne(`SELECT * FROM nba_markets WHERE id = ?`, [nba_market_id]);
    if (!market) throw new NotFoundError(`Market ${nba_market_id} not found`);
    if (market.status !== 'open') throw new ConflictError(`Market is not open`);

    // Validate outcome belongs to market
    const outcome = await queryOne(
      `SELECT * FROM nba_market_outcomes WHERE id = ? AND nba_market_id = ?`,
      [predicted_outcome_id, nba_market_id]
    );
    if (!outcome) throw new BadRequestError(`Invalid outcome for this market`);

    const id = require('crypto').randomUUID();
    await queryOne(
      `INSERT INTO nba_predictions (id, agent_id, nba_market_id, predicted_outcome_id, p_value, rationale)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, agent_id, nba_market_id, predicted_outcome_id, p_value, rationale]
    );
    
    return this.getPredictionById(id);
  }

  static async getPredictionById(id) {
    return queryOne(`SELECT * FROM nba_predictions WHERE id = ?`, [id]);
  }

  static async getPredictionByAgentAndMarket(agentId, marketId) {
    return queryOne(
      `SELECT * FROM nba_predictions WHERE agent_id = ? AND nba_market_id = ?`,
      [agentId, marketId]
    );
  }

  static async updatePrediction(id, updates) {
    const { predicted_outcome_id, p_value, rationale } = updates;
    await queryOne(
      `UPDATE nba_predictions SET predicted_outcome_id = ?, p_value = ?, rationale = ?, updated_at = NOW() WHERE id = ?`,
      [predicted_outcome_id, p_value, rationale, id]
    );
    return this.getPredictionById(id);
  }

  static async getPredictionsByAgent(agentId) {
    return queryAll(`SELECT * FROM nba_predictions WHERE agent_id = ? ORDER BY created_at DESC`, [agentId]);
  }

  static async getPredictionsByMarket(marketId) {
    return queryAll(`SELECT * FROM nba_predictions WHERE nba_market_id = ? ORDER BY created_at DESC`, [marketId]);
  }
}

module.exports = NbaPredictionService;
