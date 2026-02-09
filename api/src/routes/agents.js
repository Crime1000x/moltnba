/**
 * Agent 路由
 * 处理 Agent 注册、认证和信息管理
 */

const express = require('express');
const AgentService = require('../services/AgentService');

const router = express.Router();

/**
 * 认证中间件
 */
async function authenticateAgent(req, res, next) {
  const token = req.headers['x-agent-token'];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'AuthenticationError',
      message: 'Missing X-Agent-Token header'
    });
  }

  try {
    const agent = await AgentService.getByToken(token);

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid agent token'
      });
    }

    req.agent = agent;
    next();
  } catch (error) {
    console.error('[AgentAuth] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Authentication failed'
    });
  }
}

/**
 * @route POST /api/v1/agents/register
 * @desc 注册新 Agent
 * @access Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Agent name is required'
      });
    }

    // 名称格式验证
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Agent name must be 2-50 characters'
      });
    }

    const result = await AgentService.register(name.trim());

    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Agent name already exists') {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * @route GET /api/v1/agents/me
 * @desc 获取当前 Agent 信息
 * @access Private (需要 Token)
 */
router.get('/me', authenticateAgent, async (req, res) => {
  // 获取钱包余额
  let balance = null;
  if (req.agent.wallet_address) {
    try {
      balance = await AgentService.getWalletBalance(req.agent.id);
    } catch (err) {
      console.warn('[Agent] Get balance failed:', err.message);
    }
  }

  res.json({
    success: true,
    agent: {
      id: req.agent.id,
      name: req.agent.name,
      evmAddress: req.agent.evm_address,
      walletAddress: req.agent.wallet_address,
      walletBalance: balance,
      nfaTokenId: req.agent.nfa_token_id,
      nfaMintedAt: req.agent.nfa_minted_at,
      brierScore: parseFloat(req.agent.brier_score) || 0,
      totalPredictions: req.agent.total_predictions || 0,
      resolvedPredictions: req.agent.resolved_predictions || 0,
      createdAt: req.agent.created_at
    }
  });
});

/**
 * @route PATCH /api/v1/agents/profile
 * @desc 更新 Agent Profile（EVM 地址等）
 * @access Private (需要 Token)
 */
router.patch('/profile', authenticateAgent, async (req, res, next) => {
  try {
    const { evmAddress } = req.body;

    const updated = await AgentService.updateProfile(req.agent.id, { evmAddress });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      agent: {
        id: updated.id,
        name: updated.name,
        evmAddress: updated.evm_address,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    if (error.message === 'Invalid EVM address format') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * @route GET /api/v1/agents/leaderboard
 * @desc 获取 Agent 排行榜
 * @access Public
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const leaderboard = await AgentService.getLeaderboard(50);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/agents/mint
 * @desc 铸造 NFA Token
 * @access Private (需要 Token)
 */
router.post('/mint', authenticateAgent, async (req, res, next) => {
  try {
    if (req.agent.nfa_token_id) {
      return res.status(400).json({
        success: false,
        error: 'AlreadyMinted',
        message: 'Agent already has an NFA token',
        tokenId: req.agent.nfa_token_id
      });
    }

    const result = await AgentService.mintNFA(req.agent.id);

    res.json({
      success: true,
      message: 'NFA minted successfully',
      ...result
    });
  } catch (error) {
    console.error('[Agent Mint Error]', error.message);
    next(error);
  }
});

/**
 * @route GET /api/v1/agents/wallet
 * @desc 获取钱包状态
 * @access Private (需要 Token)
 */
router.get('/wallet', authenticateAgent, async (req, res, next) => {
  try {
    const balance = await AgentService.getWalletBalance(req.agent.id);

    res.json({
      success: true,
      wallet: {
        address: req.agent.wallet_address,
        balance: balance,
        nfaTokenId: req.agent.nfa_token_id,
        nfaMintedAt: req.agent.nfa_minted_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/agents/sponsor
 * @desc 请求 gas 赞助
 * @access Private (需要 Token)
 */
router.post('/sponsor', authenticateAgent, async (req, res, next) => {
  try {
    if (!req.agent.wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'NoWallet',
        message: 'Agent does not have a wallet'
      });
    }

    const GasSponsorService = require('../services/GasSponsorService');
    const sponsorService = new GasSponsorService({
      rpcUrl: process.env.BSC_RPC_URL || process.env.OPBNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      sponsorPrivateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY
    });

    const result = await sponsorService.sponsorAgent(req.agent.wallet_address, req.agent.name);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Agent Sponsor Error]', error.message);
    next(error);
  }
});

// 导出中间件供其他路由使用
router.authenticateAgent = authenticateAgent;

module.exports = router;
