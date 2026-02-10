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

  /**
   * 获取 Agent 统计数据
   */
  static async getAgentStats(agentId) {
    const basic = await queryOne(
      `SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN brier_score IS NOT NULL THEN 1 END) as resolved_predictions,
        AVG(CASE WHEN brier_score IS NOT NULL THEN brier_score END) as avg_brier_score,
        AVG(p_value) as avg_confidence
       FROM nba_predictions WHERE agent_id = ?`,
      [agentId]
    );
    
    const accuracy = await queryOne(
      `SELECT 
        COUNT(CASE WHEN brier_score < 0.25 THEN 1 END) as correct,
        COUNT(CASE WHEN brier_score >= 0.25 THEN 1 END) as incorrect
       FROM nba_predictions WHERE agent_id = ? AND brier_score IS NOT NULL`,
      [agentId]
    );

    return {
      totalPredictions: basic?.total_predictions || 0,
      resolvedPredictions: basic?.resolved_predictions || 0,
      avgBrierScore: basic?.avg_brier_score ? parseFloat(basic.avg_brier_score).toFixed(4) : null,
      avgConfidence: basic?.avg_confidence ? parseFloat(basic.avg_confidence).toFixed(2) : null,
      correct: accuracy?.correct || 0,
      incorrect: accuracy?.incorrect || 0,
      accuracy: accuracy?.correct > 0 ? 
        ((accuracy.correct / (accuracy.correct + accuracy.incorrect)) * 100).toFixed(1) : null
    };
  }

  /**
   * 获取市场预测对比数据
   */
  static async getMarketComparison(marketId) {
    const predictions = await queryAll(
      `SELECT p.*, a.name as agent_name, o.name as outcome_name, o.outcome_value
       FROM nba_predictions p
       JOIN agents a ON p.agent_id = a.id
       JOIN nba_market_outcomes o ON p.predicted_outcome_id = o.id
       WHERE p.nba_market_id = ?
       ORDER BY p.p_value DESC`,
      [marketId]
    );
    
    const homeVotes = predictions.filter(p => p.outcome_value === 'home').length;
    const awayVotes = predictions.filter(p => p.outcome_value === 'away').length;
    const total = predictions.length;
    
    return {
      predictions,
      consensus: {
        home: total > 0 ? ((homeVotes / total) * 100).toFixed(0) : 0,
        away: total > 0 ? ((awayVotes / total) * 100).toFixed(0) : 0,
        total
      }
    };
  }
}

module.exports = NbaPredictionService;
