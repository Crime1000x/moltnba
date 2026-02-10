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

  static async getRecentPredictions(limit = 10) {
    return queryAll(
      `SELECT p.*, a.name as agent_name, m.title as market_title
       FROM nba_predictions p
       JOIN agents a ON p.agent_id = a.id
       JOIN nba_markets m ON p.nba_market_id = m.id
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * 结算市场预测
   * @param {string} marketId - 市场ID
   * @param {string} winningOutcomeId - 获胜结果ID
   */
  static async resolveMarketPredictions(marketId, winningOutcomeId) {
    // 获取该市场的所有预测
    const predictions = await queryAll(
      `SELECT * FROM nba_predictions WHERE nba_market_id = ? AND brier_score IS NULL`,
      [marketId]
    );

    let resolved = 0;
    for (const pred of predictions) {
      // 计算 Brier Score
      const isCorrect = pred.predicted_outcome_id === winningOutcomeId;
      const pValue = parseFloat(pred.p_value);
      const actual = isCorrect ? 1 : 0;
      const brierScore = Math.pow(pValue - actual, 2);

      await queryOne(
        `UPDATE nba_predictions SET brier_score = ?, updated_at = NOW() WHERE id = ?`,
        [brierScore, pred.id]
      );
      resolved++;
    }

    // 更新市场状态
    await queryOne(
      `UPDATE nba_markets SET status = 'resolved', resolved_outcome_id = ?, updated_at = NOW() WHERE id = ?`,
      [winningOutcomeId, marketId]
    );

    return { resolved, marketId };
  }
}

module.exports = NbaPredictionService;
