/**
 * Agent 服务
 * 处理 Agent 注册、认证和信息管理
 * 合并了 AI 代理钱包功能
 */

const { query, queryOne } = require('../config/database');
const crypto = require('crypto');
const { ethers } = require('ethers');

// 加密密钥
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key-change-me!';

class AgentService {
  /**
   * 生成唯一 ID
   */
  static generateId(prefix = 'agent') {
    const random = crypto.randomBytes(12).toString('hex');
    return `${prefix}_${random}`;
  }

  /**
   * 生成 Agent Token
   */
  static generateToken() {
    const random = crypto.randomBytes(32).toString('hex');
    return `mlt_${random}`;
  }

  /**
   * 加密私钥
   */
  static encryptPrivateKey(privateKey) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密私钥
   */
  static decryptPrivateKey(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 注册新 Agent（包含钱包创建）
   * @param {string} name - Agent 名称
   */
  static async register(name) {
    const id = this.generateId('agent');
    const token = this.generateToken();

    // 创建独立钱包
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);

    try {
      await query(
        `INSERT INTO agents (id, name, token, wallet_address, wallet_encrypted) VALUES (?, ?, ?, ?, ?)`,
        [id, name, token, walletAddress, encryptedPrivateKey]
      );

      // 尝试赞助 gas
      let sponsored = false;
      let sponsorTx = null;
      try {
        const GasSponsorService = require('./GasSponsorService');
        const sponsorService = new GasSponsorService({
          rpcUrl: process.env.BSC_RPC_URL || process.env.OPBNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
          sponsorPrivateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY
        });
        const result = await sponsorService.sponsorAgent(walletAddress, name);
        sponsored = result.sponsored;
        sponsorTx = result.txHash;
      } catch (err) {
        console.warn(`[AgentService] Gas sponsorship failed for ${name}:`, err.message);
      }

      return {
        agentId: id,
        agentToken: token,
        name: name,
        walletAddress: walletAddress,
        sponsored: sponsored,
        sponsorTx: sponsorTx,
        message: 'Agent registered successfully with blockchain wallet. Save your token - it cannot be recovered!'
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Agent name already exists');
      }
      throw error;
    }
  }

  /**
   * 通过 Token 获取 Agent
   * @param {string} token - Agent Token
   */
  static async getByToken(token) {
    if (!token || !token.startsWith('mlt_')) {
      return null;
    }

    const result = await queryOne(
      `SELECT id, name, evm_address, wallet_address, wallet_encrypted,
                    nfa_token_id, nfa_minted_at, brier_score, total_predictions, 
                    resolved_predictions, created_at 
             FROM agents WHERE token = ?`,
      [token]
    );

    return result;
  }

  // Alias for auth middleware
  static async findByApiKey(token) {
    return this.getByToken(token);
  }

  /**
   * 通过 ID 获取 Agent
   * @param {string} id - Agent ID
   */
  static async getById(id) {
    const result = await queryOne(
      `SELECT id, name, evm_address, wallet_address, wallet_encrypted,
                    nfa_token_id, nfa_minted_at, brier_score, total_predictions, 
                    resolved_predictions, created_at 
             FROM agents WHERE id = ?`,
      [id]
    );

    return result;
  }

  /**
   * 更新 Agent Profile
   * @param {string} agentId - Agent ID
   * @param {Object} updates - 更新内容
   */
  static async updateProfile(agentId, updates) {
    const { evmAddress } = updates;

    // 验证 EVM 地址格式
    if (evmAddress !== null && evmAddress !== undefined) {
      if (evmAddress && !/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
        throw new Error('Invalid EVM address format');
      }
    }

    await query(
      `UPDATE agents SET evm_address = ? WHERE id = ?`,
      [evmAddress || null, agentId]
    );

    return this.getById(agentId);
  }

  /**
   * 更新 Agent 统计数据
   * @param {string} agentId - Agent ID
   */
  static async updateStats(agentId) {
    // 计算预测统计
    const stats = await queryOne(
      `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN resolved = TRUE THEN 1 ELSE 0 END) as resolved,
                AVG(CASE WHEN resolved = TRUE THEN brier_contribution ELSE NULL END) as avg_brier
             FROM predictions WHERE agent_id = ?`,
      [agentId]
    );

    await query(
      `UPDATE agents SET 
                total_predictions = ?,
                resolved_predictions = ?,
                brier_score = ?
             WHERE id = ?`,
      [
        stats.total || 0,
        stats.resolved || 0,
        stats.avg_brier || 0,
        agentId
      ]
    );
  }

  /**
   * 获取排行榜
   * @param {number} limit - 返回数量
   */
  static async getLeaderboard(limit = 50) {
    const result = await query(
      `SELECT 
                id as agentId,
                name as agentName,
                brier_score as brierScore,
                total_predictions as totalPredictions,
                resolved_predictions as resolvedPredictions,
                win_count as winCount,
                created_at as createdAt
             FROM agents
             WHERE total_predictions > 0
             ORDER BY 
               CASE WHEN resolved_predictions > 0 THEN brier_score ELSE 999 END ASC,
               total_predictions DESC
             LIMIT ?`,
      [limit]
    );

    // 添加排名和胜率
    const agents = (result.rows || []).map((agent, index) => ({
      ...agent,
      brierScore: parseFloat(agent.brierScore) || 0,
      winCount: parseInt(agent.winCount) || 0,
      winRate: agent.resolvedPredictions > 0
        ? ((agent.winCount || 0) / agent.resolvedPredictions * 100).toFixed(1)
        : '0.0',
      rank: index + 1
    }));

    return {
      agents,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 通过名称获取 Agent
   */
  static async getByName(name) {
    const result = await queryOne(
      `SELECT id, name, evm_address, wallet_address, wallet_encrypted,
                    nfa_token_id, nfa_minted_at, brier_score, total_predictions, 
                    resolved_predictions, created_at 
             FROM agents WHERE name = ?`,
      [name]
    );
    return result;
  }

  /**
   * 获取 Agent 钱包 (用于签名交易)
   */
  static async getAgentWallet(agentId) {
    const agent = await this.getById(agentId);
    if (!agent || !agent.wallet_encrypted) {
      throw new Error('Agent wallet not found');
    }

    const privateKey = this.decryptPrivateKey(agent.wallet_encrypted);
    const provider = new ethers.JsonRpcProvider(
      process.env.BSC_RPC_URL || process.env.OPBNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );
    return new ethers.Wallet(privateKey, provider);
  }

  static getAgentWalletFromEncrypted(walletEncrypted, rpcUrl) {
    const privateKey = this.decryptPrivateKey(walletEncrypted);
    const provider = new ethers.JsonRpcProvider(rpcUrl || 'https://data-seed-prebsc-1-s1.binance.org:8545');
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * 铸造 NFA Token
   */
  static async mintNFA(agentId) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    if (agent.nfa_token_id) {
      throw new Error('Agent already has NFA token');
    }

    const nfaAddress = process.env.MOLTNFA_CONTRACT_ADDRESS;
    if (!nfaAddress) {
      throw new Error('NFA contract address not configured');
    }

    // 使用 sponsor/owner 钱包调用 mintFree
    const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545');
    const sponsorWallet = new ethers.Wallet(process.env.SPONSOR_WALLET_PRIVATE_KEY, provider);

    const abi = [
      'function mintFree(address to, string memory persona, string memory experience) external returns (uint256)'
    ];
    const contract = new ethers.Contract(nfaAddress, abi, sponsorWallet);

    const tx = await contract.mintFree(agent.wallet_address, agent.name, "0");
    const receipt = await tx.wait();

    // 从事件中获取 tokenId (假设事件有 tokenId)
    let tokenId = null;
    const logs = receipt.logs || [];
    for (const log of logs) {
      if (log.topics && log.topics[0]) {
        // Transfer(address,address,uint256) 事件
        if (log.topics.length >= 4) {
          tokenId = BigInt(log.topics[3]).toString();
          break;
        }
      }
    }

    // 更新数据库
    await query(
      `UPDATE agents SET nfa_token_id = ?, nfa_minted_at = NOW() WHERE id = ?`,
      [tokenId, agentId]
    );

    return {
      txHash: receipt.hash,
      tokenId: tokenId,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * 获取 Agent 钱包余额
   */
  static async getWalletBalance(agentId) {
    const agent = await this.getById(agentId);
    if (!agent || !agent.wallet_address) {
      throw new Error('Agent wallet not found');
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.BSC_RPC_URL || process.env.OPBNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );
    const balance = await provider.getBalance(agent.wallet_address);
    return ethers.formatEther(balance);
  }
}

module.exports = AgentService;
