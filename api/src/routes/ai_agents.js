/**
 * AI 代理管理 API 路由
 * 
 * 端点：
 * POST /ai-agents - 创建 AI 代理
 * GET /ai-agents - 列出所有代理
 * GET /ai-agents/:name - 获取代理详情
 * POST /ai-agents/:name/sponsor - 赞助 gas
 * POST /ai-agents/:name/mint - 铸造 NFA
 * POST /ai-agents/:name/predict - 提交预测
 * GET /ai-agents/:name/stats - 获取链上统计
 */

const express = require('express');
const router = express.Router();
const AIAgentWalletService = require('../services/AIAgentWalletService');
const GasSponsorService = require('../services/GasSponsorService');

// 初始化服务
const walletService = new AIAgentWalletService({
    rpcUrl: process.env.OPBNB_RPC_URL || 'https://opbnb-testnet-rpc.bnbchain.org',
    nfaTokenAddress: process.env.NFA_TOKEN_ADDRESS,
    predictionLogicAddress: process.env.PREDICTION_LOGIC_ADDRESS,
    encryptionKey: process.env.WALLET_ENCRYPTION_KEY
});

const sponsorService = new GasSponsorService({
    rpcUrl: process.env.OPBNB_RPC_URL || 'https://opbnb-testnet-rpc.bnbchain.org',
    sponsorPrivateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY
});

/**
 * POST /ai-agents
 * 创建新的 AI 代理
 */
router.post('/', async (req, res) => {
    try {
        const { name, config } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Agent name is required' });
        }

        // 验证名称格式
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            return res.status(400).json({
                error: 'Invalid agent name. Use only letters, numbers, hyphens and underscores'
            });
        }

        // 创建钱包
        const wallet = await walletService.createAgentWallet(name);

        // 自动赞助 gas
        let sponsorResult = null;
        try {
            sponsorResult = await sponsorService.sponsorAgent(wallet.address, name);
        } catch (err) {
            console.warn(`Gas sponsorship failed for ${name}:`, err.message);
        }

        res.status(201).json({
            success: true,
            agent: wallet,
            sponsored: sponsorResult?.sponsored || false,
            sponsorTx: sponsorResult?.txHash,
            message: `AI Agent "${name}" created successfully`
        });

    } catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /ai-agents
 * 列出所有 AI 代理
 */
router.get('/', async (req, res) => {
    try {
        const agents = walletService.listAgents();

        // 获取每个代理的余额
        const agentsWithBalance = await Promise.all(
            agents.map(async (agent) => {
                try {
                    const balance = await walletService.getAgentBalance(agent.agentName);
                    return { ...agent, balance };
                } catch {
                    return { ...agent, balance: 'unknown' };
                }
            })
        );

        res.json({
            count: agents.length,
            agents: agentsWithBalance
        });

    } catch (error) {
        console.error('List agents error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /ai-agents/:name
 * 获取代理详情
 */
router.get('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const agents = walletService.listAgents();
        const agent = agents.find(a => a.agentName === name);

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // 获取余额
        const balance = await walletService.getAgentBalance(name);

        // 获取链上统计
        let stats = null;
        try {
            stats = await walletService.getAgentStats(name);
        } catch (err) {
            console.warn(`Get stats failed for ${name}:`, err.message);
        }

        res.json({
            ...agent,
            balance,
            onchainStats: stats
        });

    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /ai-agents/:name/sponsor
 * 赞助 gas
 */
router.post('/:name/sponsor', async (req, res) => {
    try {
        const { name } = req.params;
        const agents = walletService.listAgents();
        const agent = agents.find(a => a.agentName === name);

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const result = await sponsorService.sponsorAgent(agent.address, name);
        res.json(result);

    } catch (error) {
        console.error('Sponsor error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /ai-agents/:name/mint
 * 铸造 NFA
 */
router.post('/:name/mint', async (req, res) => {
    try {
        const { name } = req.params;
        const { config } = req.body;

        const result = await walletService.mintNFA(name, config || {});

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Mint NFA error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /ai-agents/:name/predict
 * 提交预测
 */
router.post('/:name/predict', async (req, res) => {
    try {
        const { name } = req.params;
        const { homeTeam, awayTeam, gameDate, homeWinProbability, rationale } = req.body;

        if (!homeTeam || !awayTeam || homeWinProbability === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: homeTeam, awayTeam, homeWinProbability'
            });
        }

        if (homeWinProbability < 0 || homeWinProbability > 100) {
            return res.status(400).json({
                error: 'homeWinProbability must be between 0 and 100'
            });
        }

        const result = await walletService.submitPrediction(name, {
            homeTeam,
            awayTeam,
            gameDate: gameDate || new Date().toISOString().split('T')[0],
            homeWinProbability,
            rationale
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Submit prediction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /ai-agents/:name/stats
 * 获取链上统计
 */
router.get('/:name/stats', async (req, res) => {
    try {
        const { name } = req.params;
        const stats = await walletService.getAgentStats(name);
        res.json(stats);

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /sponsor/info
 * 获取赞助钱包信息
 */
router.get('/sponsor/info', async (req, res) => {
    try {
        const info = await sponsorService.getSponsorInfo();
        res.json(info);
    } catch (error) {
        console.error('Get sponsor info error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
