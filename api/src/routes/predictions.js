/**
 * Predictions 路由
 * 处理 Agent 预测的提交和查询
 */

const express = require('express');
const { ethers } = require('ethers');
const PredictionService = require('../services/PredictionService');
const AgentService = require('../services/AgentService');
const { getUnifiedNBAData } = require('../services/PublicApiService');

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
        console.error("[Prediction Error]", error.message, error.stack);
        console.error('[AgentAuth] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'ServerError',
            message: 'Authentication failed'
        });
    }
}

/**
 * @route POST /api/v1/predictions
 * @desc 提交预测
 * @access Private (需要 Token)
 */
router.post('/', authenticateAgent, async (req, res, next) => {
    try {
        const { gameId, pHome, rationale } = req.body;

        // 验证必填字段
        if (!gameId) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'gameId is required'
            });
        }

        if (pHome === undefined || pHome === null) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'pHome (probability of home team winning) is required'
            });
        }

        if (typeof pHome !== 'number' || pHome < 0 || pHome > 1) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'pHome must be a number between 0 and 1'
            });
        }

        if (!rationale || rationale.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'rationale is required'
            });
        }

        // 获取比赛信息
        const games = await getUnifiedNBAData(false);
        const game = games.find(g => g.gameId === gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'NotFoundError',
                message: 'Game not found'
            });
        }

        // 检查比赛状态 - 已结束的比赛
        if (game.isFinal) {
            return res.status(409).json({
                success: false,
                error: 'ConflictError',
                message: 'Cannot predict on games that have already finished'
            });
        }

        // 检查比赛时间 - 已开始的比赛
        const gameTime = new Date(game.gameTime);
        const now = new Date();

        if (gameTime <= now) {
            return res.status(409).json({
                success: false,
                error: 'PredictionWindowClosed',
                message: 'Cannot predict on games that have already started. Prediction window closes at game start time.',
                gameTime: game.gameTime,
                currentTime: now.toISOString()
            });
        }

        // 检查比赛状态是否为 live (正在进行)
        if (game.status === 'live' || game.status === 'in_progress') {
            return res.status(409).json({
                success: false,
                error: 'PredictionWindowClosed',
                message: 'Cannot predict on games that are currently in progress'
            });
        }

        // 提交预测到数据库
        const prediction = await PredictionService.submitPrediction({
            agentId: req.agent.id,
            agentName: req.agent.name,
            gameId,
            homeTeam: game.homeTeam.name,
            awayTeam: game.awayTeam.name,
            pHome,
            rationale: rationale.trim().substring(0, 800),
            gameTime: game.gameTime
        });

        // 尝试提交链上预测
        let onchainResult = null;
        try {
            // 检查代理是否有 NFA token 和钱包
            if (req.agent.nfa_token_id && req.agent.wallet_address && req.agent.wallet_encrypted) {
                const predictionLogicAddress = process.env.PREDICTION_LOGIC_ADDRESS || process.env.PREDICTION_CONTRACT_ADDRESS;
                const rpcUrl = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';

                if (predictionLogicAddress) {
                    // 解密 agent 钱包
                    const agentWallet = AgentService.getAgentWalletFromEncrypted(req.agent.wallet_encrypted, rpcUrl);

                    const abi = [
                        'function makePrediction(uint256 agentId, bytes32 gameId, uint256 probability, string rationaleHash) returns (uint256)',
                        'event PredictionMade(uint256 indexed predictionId, uint256 indexed agentId, bytes32 indexed gameId, uint256 probability, uint256 timestamp)'
                    ];
                    const contract = new ethers.Contract(predictionLogicAddress, abi, agentWallet);

                    const gameIdHash = ethers.keccak256(ethers.toUtf8Bytes(gameId));
                    const probability = ethers.parseEther(pHome.toString()); // 1e18 精度

                    const tx = await contract.makePrediction(
                        req.agent.nfa_token_id,
                        gameIdHash,
                        probability,
                        rationale.trim().substring(0, 200)
                    );
                    const receipt = await tx.wait();

                    onchainResult = {
                        txHash: receipt.hash,
                        blockNumber: receipt.blockNumber
                    };

                    console.log(`[Onchain] Agent ${req.agent.name} prediction submitted: ${receipt.hash}`);

                    // 保存链上数据到数据库
                    await PredictionService.updateOnchainData(
                        prediction.id,
                        receipt.hash,
                        receipt.blockNumber
                    );
                }
            }
        } catch (onchainError) {
            // 链上预测失败不影响主流程，只记录日志
            console.warn(`[Onchain] Failed to submit onchain prediction for ${req.agent.name}:`, onchainError.message);
        }

        res.status(201).json({
            success: true,
            ...prediction,
            // 如果有链上交易，添加 txHash
            ...(onchainResult && {
                onchain: {
                    txHash: onchainResult.txHash,
                    blockNumber: onchainResult.blockNumber
                }
            })
        });
    } catch (error) {
        console.error("[Prediction Error]", error.message, error.stack);
        if (error.message.includes('already started')) {
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
 * @route GET /api/v1/predictions/mine
 * @desc 获取我的所有预测
 * @access Private (需要 Token)
 */
router.get('/mine', authenticateAgent, async (req, res, next) => {
    try {
        const predictions = await PredictionService.getPredictionsByAgent(req.agent.id);

        res.json({
            success: true,
            predictions,
            totalCount: predictions.length
        });
    } catch (error) {
        console.error("[Prediction Error]", error.message, error.stack);
        next(error);
    }
});

/**
 * @route GET /api/v1/predictions/game/:gameId
 * @desc 获取比赛的所有预测
 * @access Public
 */
router.get('/game/:gameId', async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const predictions = await PredictionService.getPredictionsByGame(gameId);

        res.json({
            success: true,
            predictions,
            gameId,
            totalCount: predictions.length
        });
    } catch (error) {
        console.error("[Prediction Error]", error.message, error.stack);
        next(error);
    }
});

/**
 * @route GET /api/v1/predictions/tx/:txHash
 * @desc 通过交易哈希查询预测
 * @access Public
 */
router.get('/tx/:txHash', async (req, res, next) => {
    try {
        const { txHash } = req.params;

        if (!txHash || !txHash.startsWith('0x')) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'Invalid transaction hash format'
            });
        }

        const prediction = await PredictionService.getPredictionByTxHash(txHash);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'NotFoundError',
                message: 'No prediction found for this transaction hash'
            });
        }

        res.json({
            success: true,
            prediction,
            explorerUrl: `https://testnet.bscscan.com/tx/${txHash}`
        });
    } catch (error) {
        console.error("[Prediction Error]", error.message, error.stack);
        next(error);
    }
});

module.exports = router;
