/**
 * 预测服务
 * 处理 Agent 预测的提交、查询和评分
 */

const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

class PredictionService {
  /**
   * 生成唯一 ID
   */
  static generateId() {
    const random = crypto.randomBytes(12).toString('hex');
    return `pred_${random}`;
  }

  /**
   * 提交预测
   * @param {Object} data - 预测数据
   */
  static async submitPrediction(data) {
    const { agentId, agentName, gameId, homeTeam, awayTeam, pHome, rationale, gameTime } = data;

    // 验证 pHome 范围
    if (pHome < 0 || pHome > 1) {
      throw new Error('pHome must be between 0 and 1');
    }

    // 验证 rationale 长度
    if (rationale && rationale.length > 800) {
      throw new Error('Rationale must be 800 characters or less');
    }

    // 检查比赛是否已经开始
    if (gameTime && new Date(gameTime) < new Date()) {
      throw new Error('Cannot predict on games that have already started');
    }

    const id = this.generateId();

    // 转换日期格式为 MySQL 兼容格式
    let mysqlGameTime = null;
    if (gameTime) {
      const dt = new Date(gameTime);
      mysqlGameTime = dt.toISOString().slice(0, 19).replace('T', ' ');
    }

    // 检查是否已有预测（更新而不是创建）
    const existing = await queryOne(
      `SELECT id FROM predictions WHERE agent_id = ? AND game_id = ?`,
      [agentId, gameId]
    );

    if (existing) {
      // 更新现有预测
      await query(
        `UPDATE predictions SET p_home = ?, rationale = ?, updated_at = NOW() 
                 WHERE agent_id = ? AND game_id = ?`,
        [pHome, rationale, agentId, gameId]
      );

      return {
        id: existing.id,
        agentId,
        agentName,
        gameId,
        homeTeam,
        awayTeam,
        pHome,
        rationale,
        updated: true,
        createdAt: new Date().toISOString()
      };
    }

    // 创建新预测
    await query(
      `INSERT INTO predictions 
             (id, agent_id, game_id, home_team, away_team, p_home, rationale, game_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, agentId, gameId, homeTeam, awayTeam, pHome, rationale, mysqlGameTime]
    );

    // 更新 Agent 的预测计数
    await query(
      `UPDATE agents SET total_predictions = total_predictions + 1 WHERE id = ?`,
      [agentId]
    );

    return {
      id,
      agentId,
      agentName,
      gameId,
      homeTeam,
      awayTeam,
      pHome,
      rationale,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 获取比赛的所有预测
   * @param {string} gameId - 比赛 ID
   */
  static async getPredictionsByGame(gameId) {
    const result = await query(
      `SELECT 
                p.id,
                p.agent_id as agentId,
                a.name as agentName,
                p.p_home as pHome,
                p.rationale,
                p.resolved,
                p.actual_outcome as actualOutcome,
                p.brier_contribution as brierContribution,
                p.created_at as createdAt
             FROM predictions p
             JOIN agents a ON p.agent_id = a.id
             WHERE p.game_id = ?
             ORDER BY p.created_at DESC`,
      [gameId]
    );

    return result.rows || [];
  }

  /**
   * 获取 Agent 的所有预测
   * @param {string} agentId - Agent ID
   */
  static async getPredictionsByAgent(agentId) {
    const result = await query(
      `SELECT 
                id,
                game_id as gameId,
                home_team as homeTeam,
                away_team as awayTeam,
                p_home as pHome,
                rationale,
                game_time as gameTime,
                resolved,
                actual_outcome as actualOutcome,
                brier_contribution as brierContribution,
                created_at as createdAt
             FROM predictions
             WHERE agent_id = ?
             ORDER BY created_at DESC`,
      [agentId]
    );

    return result.rows || [];
  }

  /**
   * 解决预测（比赛结束后）
   * @param {string} gameId - 比赛 ID
   * @param {string} outcome - 'home' | 'away'
   */
  static async resolvePredictions(gameId, outcome) {
    if (!['home', 'away'].includes(outcome)) {
      throw new Error('Outcome must be "home" or "away"');
    }

    // 获取该比赛的所有未解决预测
    const predictions = await query(
      `SELECT id, agent_id, p_home FROM predictions 
             WHERE game_id = ? AND resolved = FALSE`,
      [gameId]
    );

    const rows = predictions.rows || [];
    let resolved = 0;

    for (const pred of rows) {
      // 计算 Brier Score
      // outcome = 'home' -> actual = 1, outcome = 'away' -> actual = 0
      const actual = outcome === 'home' ? 1 : 0;
      const pHome = parseFloat(pred.p_home);
      const brierContribution = Math.pow(pHome - actual, 2);

      await query(
        `UPDATE predictions SET 
                    resolved = TRUE,
                    actual_outcome = ?,
                    brier_contribution = ?
                 WHERE id = ?`,
        [outcome, brierContribution, pred.id]
      );

      resolved++;
    }

    // 更新所有相关 Agent 的统计
    const agentIds = [...new Set(rows.map(p => p.agent_id))];
    const AgentService = require('./AgentService');

    for (const agentId of agentIds) {
      await AgentService.updateStats(agentId);
    }

    return { resolved, gameId, outcome };
  }

  /**
   * 更新预测的链上数据
   * @param {string} predictionId - 预测 ID
   * @param {string} txHash - 交易哈希
   * @param {number} blockNumber - 区块高度
   */
  static async updateOnchainData(predictionId, txHash, blockNumber) {
    await query(
      `UPDATE predictions SET tx_hash = ?, block_number = ? WHERE id = ?`,
      [txHash, blockNumber, predictionId]
    );
    return { predictionId, txHash, blockNumber };
  }

  /**
   * 通过交易哈希查询预测
   * @param {string} txHash - 交易哈希
   */
  static async getPredictionByTxHash(txHash) {
    const result = await queryOne(
      `SELECT 
        p.id,
        p.agent_id as agentId,
        a.name as agentName,
        p.game_id as gameId,
        p.home_team as homeTeam,
        p.away_team as awayTeam,
        p.p_home as pHome,
        p.rationale,
        p.game_time as gameTime,
        p.resolved,
        p.actual_outcome as actualOutcome,
        p.brier_contribution as brierContribution,
        p.tx_hash as txHash,
        p.block_number as blockNumber,
        p.created_at as createdAt
      FROM predictions p
      JOIN agents a ON p.agent_id = a.id
      WHERE p.tx_hash = ?`,
      [txHash]
    );
    return result || null;
  }
}

module.exports = PredictionService;
