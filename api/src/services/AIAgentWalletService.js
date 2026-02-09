/**
 * AIAgentWalletService.js
 * AI 代理自主钱包管理服务
 * 
 * 功能：
 * 1. 为每个 AI 代理生成独立钱包
 * 2. 管理钱包私钥（加密存储）
 * 3. 执行链上操作（铸造 NFA、提交预测）
 */

const { ethers } = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 合约 ABI (简化版)
const NFA_TOKEN_ABI = [
    'function mintPredictionAgent(string persona, string experience) payable returns (uint256)',
    'function recordPrediction(uint256 tokenId, bytes32 gameId, uint256 homeWinProb, string rationale)',
    'function getAgentsByOwner(address owner) view returns (uint256[])',
    'function getState(uint256 tokenId) view returns (tuple(uint256 balance, uint8 status, address owner, address logicAddress, uint256 lastActionTimestamp))',
    'function getAgentMetadata(uint256 tokenId) view returns (tuple(string persona, string experience, string voiceHash, string animationURI, string vaultURI, bytes32 vaultHash))',
    'event AgentMinted(uint256 indexed tokenId, address indexed owner, string persona)',
    'event PredictionRecorded(uint256 indexed tokenId, bytes32 indexed gameId, uint256 homeWinProb)'
];

const PREDICTION_LOGIC_ABI = [
    'function makePrediction(uint256 agentId, bytes32 gameId, uint256 probability, string rationaleHash) returns (uint256)',
    'function getAgentAccuracy(uint256 agentId) view returns (uint256)',
    'function agentStats(uint256 agentId) view returns (uint256 totalPredictions, uint256 correctPredictions, uint256 pendingPredictions, uint256 lastPredictionTime)',
    'event PredictionMade(uint256 indexed predictionId, uint256 indexed agentId, bytes32 indexed gameId, uint256 probability, uint256 timestamp)'
];

class AIAgentWalletService {
    constructor(config = {}) {
        // 网络配置
        this.rpcUrl = config.rpcUrl || 'https://opbnb-testnet-rpc.bnbchain.org';
        this.chainId = config.chainId || 5611;

        // 合约地址 (部署后更新)
        this.nfaTokenAddress = config.nfaTokenAddress || null;
        this.predictionLogicAddress = config.predictionLogicAddress || null;

        // 钱包存储路径 (生产环境应使用加密数据库)
        this.walletsDir = config.walletsDir || path.join(__dirname, '../data/wallets');

        // 加密密钥 (生产环境应使用 KMS)
        this.encryptionKey = config.encryptionKey || process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';

        // 连接 Provider
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

        // 确保钱包目录存在
        if (!fs.existsSync(this.walletsDir)) {
            fs.mkdirSync(this.walletsDir, { recursive: true });
        }

        // 内存中的钱包缓存
        this.walletCache = new Map();
    }

    /**
     * 为 AI 代理创建新钱包
     * @param {string} agentName - 代理名称
     * @returns {Object} 钱包信息
     */
    async createAgentWallet(agentName) {
        // 生成新钱包
        const wallet = ethers.Wallet.createRandom();
        const connectedWallet = wallet.connect(this.provider);

        // 加密私钥存储
        const encryptedKey = this._encryptPrivateKey(wallet.privateKey);

        const walletInfo = {
            agentName,
            address: wallet.address,
            encryptedPrivateKey: encryptedKey,
            createdAt: new Date().toISOString(),
            tokenId: null, // NFA token ID (铸造后更新)
            status: 'created'
        };

        // 保存到文件
        const filePath = path.join(this.walletsDir, `${agentName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(walletInfo, null, 2));

        // 添加到缓存
        this.walletCache.set(agentName, connectedWallet);

        console.log(`🤖 AI 代理 "${agentName}" 钱包创建成功`);
        console.log(`   📍 地址: ${wallet.address}`);

        return {
            agentName,
            address: wallet.address,
            status: 'created'
        };
    }

    /**
     * 获取代理钱包
     * @param {string} agentName - 代理名称
     * @returns {ethers.Wallet} 连接的钱包
     */
    getAgentWallet(agentName) {
        // 先检查缓存
        if (this.walletCache.has(agentName)) {
            return this.walletCache.get(agentName);
        }

        // 从文件加载
        const filePath = path.join(this.walletsDir, `${agentName}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Agent wallet not found: ${agentName}`);
        }

        const walletInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const privateKey = this._decryptPrivateKey(walletInfo.encryptedPrivateKey);
        const wallet = new ethers.Wallet(privateKey, this.provider);

        // 添加到缓存
        this.walletCache.set(agentName, wallet);

        return wallet;
    }

    /**
     * 获取代理钱包余额
     * @param {string} agentName - 代理名称
     * @returns {string} 余额 (BNB)
     */
    async getAgentBalance(agentName) {
        const wallet = this.getAgentWallet(agentName);
        const balance = await this.provider.getBalance(wallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * 为代理铸造 NFA
     * @param {string} agentName - 代理名称
     * @param {Object} agentConfig - 代理配置
     * @returns {Object} 铸造结果
     */
    async mintNFA(agentName, agentConfig = {}) {
        if (!this.nfaTokenAddress) {
            throw new Error('NFA Token contract address not configured');
        }

        const wallet = this.getAgentWallet(agentName);

        // 检查余额
        const balance = await this.provider.getBalance(wallet.address);
        const mintPrice = ethers.parseEther('0.001');

        if (balance < mintPrice) {
            throw new Error(`Insufficient balance. Need at least 0.001 BNB, have ${ethers.formatEther(balance)}`);
        }

        // 准备 persona
        const persona = JSON.stringify({
            name: agentName,
            strategy: agentConfig.strategy || 'statistical',
            specialty: agentConfig.specialty || 'NBA predictions',
            version: '1.0.0',
            ...agentConfig
        });

        const experience = agentConfig.experience || `AI prediction agent specialized in NBA games`;

        // 连接合约
        const nfaContract = new ethers.Contract(this.nfaTokenAddress, NFA_TOKEN_ABI, wallet);

        console.log(`🚀 AI 代理 "${agentName}" 正在铸造 NFA...`);

        // 发送交易
        const tx = await nfaContract.mintPredictionAgent(persona, experience, {
            value: mintPrice
        });

        console.log(`   ⏳ 等待确认... TX: ${tx.hash}`);
        const receipt = await tx.wait();

        // 解析事件获取 tokenId
        const mintEvent = receipt.logs.find(log => {
            try {
                const parsed = nfaContract.interface.parseLog(log);
                return parsed?.name === 'AgentMinted';
            } catch {
                return false;
            }
        });

        let tokenId = null;
        if (mintEvent) {
            const parsed = nfaContract.interface.parseLog(mintEvent);
            tokenId = parsed.args[0].toString();
        }

        // 更新钱包信息
        const filePath = path.join(this.walletsDir, `${agentName}.json`);
        const walletInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        walletInfo.tokenId = tokenId;
        walletInfo.status = 'registered';
        walletInfo.mintTxHash = receipt.hash;
        fs.writeFileSync(filePath, JSON.stringify(walletInfo, null, 2));

        console.log(`   ✅ NFA 铸造成功!`);
        console.log(`   🎫 Token ID: ${tokenId}`);
        console.log(`   🔗 TX: ${receipt.hash}`);

        return {
            agentName,
            tokenId,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    /**
     * 提交预测到链上
     * @param {string} agentName - 代理名称
     * @param {Object} prediction - 预测数据
     * @returns {Object} 交易结果
     */
    async submitPrediction(agentName, prediction) {
        if (!this.predictionLogicAddress) {
            throw new Error('PredictionLogic contract address not configured');
        }

        const wallet = this.getAgentWallet(agentName);

        // 获取 token ID
        const filePath = path.join(this.walletsDir, `${agentName}.json`);
        const walletInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!walletInfo.tokenId) {
            throw new Error(`Agent ${agentName} has not minted NFA yet`);
        }

        // 构造 gameId
        const gameId = ethers.keccak256(
            ethers.toUtf8Bytes(prediction.gameKey || `${prediction.homeTeam}-vs-${prediction.awayTeam}-${prediction.gameDate}`)
        );

        // 概率转换 (0-100 转换为 0-1e18)
        const probability = ethers.parseEther((prediction.homeWinProbability / 100).toString());

        // 理由哈希 (可以是 IPFS hash)
        const rationaleHash = prediction.rationale || '';

        // 连接合约
        const logicContract = new ethers.Contract(this.predictionLogicAddress, PREDICTION_LOGIC_ABI, wallet);

        console.log(`🎯 AI 代理 "${agentName}" 正在提交预测...`);
        console.log(`   📊 比赛: ${prediction.homeTeam} vs ${prediction.awayTeam}`);
        console.log(`   📈 主队胜率: ${prediction.homeWinProbability}%`);

        // 发送交易
        const tx = await logicContract.makePrediction(
            walletInfo.tokenId,
            gameId,
            probability,
            rationaleHash
        );

        console.log(`   ⏳ 等待确认... TX: ${tx.hash}`);
        const receipt = await tx.wait();

        console.log(`   ✅ 预测已上链!`);
        console.log(`   🔗 TX: ${receipt.hash}`);

        return {
            agentName,
            tokenId: walletInfo.tokenId,
            gameId: gameId,
            probability: prediction.homeWinProbability,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    /**
     * 获取代理链上统计
     * @param {string} agentName - 代理名称
     * @returns {Object} 统计数据
     */
    async getAgentStats(agentName) {
        if (!this.predictionLogicAddress) {
            throw new Error('PredictionLogic contract address not configured');
        }

        const filePath = path.join(this.walletsDir, `${agentName}.json`);
        const walletInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!walletInfo.tokenId) {
            return { registered: false };
        }

        const logicContract = new ethers.Contract(
            this.predictionLogicAddress,
            PREDICTION_LOGIC_ABI,
            this.provider
        );

        const [stats, accuracy] = await Promise.all([
            logicContract.agentStats(walletInfo.tokenId),
            logicContract.getAgentAccuracy(walletInfo.tokenId)
        ]);

        return {
            registered: true,
            tokenId: walletInfo.tokenId,
            totalPredictions: stats[0].toString(),
            correctPredictions: stats[1].toString(),
            pendingPredictions: stats[2].toString(),
            accuracy: (Number(accuracy) / 1e16).toFixed(2) + '%' // 转换为百分比
        };
    }

    /**
     * 列出所有代理
     * @returns {Array} 代理列表
     */
    listAgents() {
        const files = fs.readdirSync(this.walletsDir).filter(f => f.endsWith('.json'));

        return files.map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(this.walletsDir, file), 'utf8'));
            return {
                agentName: data.agentName,
                address: data.address,
                tokenId: data.tokenId,
                status: data.status,
                createdAt: data.createdAt
            };
        });
    }

    // ============ 私有方法 ============

    /**
     * 加密私钥
     */
    _encryptPrivateKey(privateKey) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * 解密私钥
     */
    _decryptPrivateKey(encryptedData) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

module.exports = AIAgentWalletService;
