# AI 自主钱包系统 - 技术设计文档

## 概述

本文档描述如何构建一个让 AI 代理拥有独立区块链钱包并自主执行链上操作的系统。

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        后端服务                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ AIAgentWallet    │    │ GasSponsor       │                  │
│  │ Service          │    │ Service          │                  │
│  │                  │    │                  │                  │
│  │ - 创建钱包       │    │ - 赞助 gas 费    │                  │
│  │ - 加密存储私钥   │    │ - 防滥用机制     │                  │
│  │ - 执行链上操作   │    │                  │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                       │                             │
│           └───────────┬───────────┘                             │
│                       ▼                                         │
│              ┌────────────────┐                                 │
│              │  智能合约      │                                 │
│              │  (链上)        │                                 │
│              └────────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. AI 代理钱包服务 (AIAgentWalletService)

**职责：** 为每个 AI 代理创建和管理独立的区块链钱包

```javascript
const { ethers } = require('ethers');
const crypto = require('crypto');
const fs = require('fs');

class AIAgentWalletService {
  constructor(config) {
    // RPC 连接
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // 钱包存储路径
    this.walletsDir = config.walletsDir || './data/wallets';
    
    // 私钥加密密钥
    this.encryptionKey = config.encryptionKey;
    
    // 合约地址
    this.contractAddress = config.contractAddress;
  }

  /**
   * 为 AI 代理创建新钱包
   */
  async createAgentWallet(agentName) {
    // 1. 生成新钱包
    const wallet = ethers.Wallet.createRandom();
    
    // 2. 加密私钥存储
    const encryptedKey = this._encryptPrivateKey(wallet.privateKey);
    
    // 3. 保存钱包信息
    const walletInfo = {
      agentName,
      address: wallet.address,
      encryptedPrivateKey: encryptedKey,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `${this.walletsDir}/${agentName}.json`,
      JSON.stringify(walletInfo, null, 2)
    );
    
    return { agentName, address: wallet.address };
  }

  /**
   * 获取代理钱包 (解密私钥)
   */
  getAgentWallet(agentName) {
    const walletInfo = JSON.parse(
      fs.readFileSync(`${this.walletsDir}/${agentName}.json`)
    );
    
    const privateKey = this._decryptPrivateKey(walletInfo.encryptedPrivateKey);
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * AI 代理执行链上操作
   */
  async executeContractCall(agentName, methodName, args) {
    const wallet = this.getAgentWallet(agentName);
    const contract = new ethers.Contract(
      this.contractAddress,
      CONTRACT_ABI,
      wallet
    );
    
    const tx = await contract[methodName](...args);
    const receipt = await tx.wait();
    
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  // 私钥加密 (AES-256-CBC)
  _encryptPrivateKey(privateKey) {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // 私钥解密
  _decryptPrivateKey(encryptedData) {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

---

### 2. Gas 赞助服务 (GasSponsorService)

**职责：** 为新创建的 AI 代理提供初始 gas 费用

```javascript
class GasSponsorService {
  constructor(config) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // 赞助钱包 (需要预存 BNB/ETH)
    this.sponsorWallet = new ethers.Wallet(
      config.sponsorPrivateKey,
      this.provider
    );
    
    // 每次赞助金额
    this.sponsorAmount = ethers.parseEther(config.amount || '0.002');
    
    // 防滥用：记录已赞助地址
    this.sponsoredAddresses = new Map();
  }

  /**
   * 赞助 AI 代理
   */
  async sponsorAgent(recipientAddress, agentName) {
    // 1. 检查是否已赞助过
    if (this.sponsoredAddresses.has(recipientAddress)) {
      throw new Error('Already sponsored');
    }

    // 2. 检查赞助钱包余额
    const balance = await this.provider.getBalance(this.sponsorWallet.address);
    if (balance < this.sponsorAmount) {
      throw new Error('Sponsor wallet insufficient balance');
    }

    // 3. 发送赞助交易
    const tx = await this.sponsorWallet.sendTransaction({
      to: recipientAddress,
      value: this.sponsorAmount
    });
    const receipt = await tx.wait();

    // 4. 记录赞助
    this.sponsoredAddresses.set(recipientAddress, Date.now());

    return { txHash: receipt.hash, amount: ethers.formatEther(this.sponsorAmount) };
  }
}
```

---

### 3. 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI 代理注册流程                               │
└─────────────────────────────────────────────────────────────────┘

     用户/系统请求创建 AI 代理
              │
              ▼
     ┌────────────────┐
     │ 1. 生成新钱包   │  ethers.Wallet.createRandom()
     │    (私钥+地址)  │
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 2. 加密存储私钥 │  AES-256-CBC 加密
     │    (本地文件)   │
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 3. 赞助 gas 费  │  赞助钱包 → AI 代理钱包
     │    (0.002 BNB)  │
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 4. AI 代理就绪  │  可以执行链上操作
     └────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    AI 代理执行链上操作                           │
└─────────────────────────────────────────────────────────────────┘

     AI 决定执行某操作 (如: 铸造 NFT)
              │
              ▼
     ┌────────────────┐
     │ 1. 加载钱包     │  解密私钥 → 创建 Wallet 实例
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 2. 构造交易     │  调用智能合约方法
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 3. 签名交易     │  使用 AI 代理的私钥
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 4. 广播到链上   │  等待确认
     └───────┬────────┘
              │
              ▼
     ┌────────────────┐
     │ 5. 返回结果     │  txHash, blockNumber
     └────────────────┘
```

---

## 安全考虑

### 私钥存储

| 方案 | 安全级别 | 适用场景 |
|------|----------|----------|
| 加密文件存储 | ⭐⭐ | 开发/测试 |
| 加密数据库 | ⭐⭐⭐ | 小规模生产 |
| AWS KMS / HSM | ⭐⭐⭐⭐⭐ | 企业级生产 |

### 防滥用机制

```javascript
// 限制每个 IP 创建代理数量
const rateLimiter = new Map();

// 限制赞助频率 (24小时冷却)
const cooldownMs = 24 * 60 * 60 * 1000;

// 验证请求来源
function validateRequest(ip, address) {
  const count = rateLimiter.get(ip) || 0;
  if (count >= 5) throw new Error('Rate limit exceeded');
  
  const lastSponsored = sponsoredAddresses.get(address);
  if (lastSponsored && Date.now() - lastSponsored < cooldownMs) {
    throw new Error('Cooldown not expired');
  }
}
```

---

## 环境变量配置

```bash
# .env

# 区块链 RPC
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# 智能合约地址
CONTRACT_ADDRESS=0x...

# 钱包加密密钥 (用于加密 AI 代理私钥)
WALLET_ENCRYPTION_KEY=your-strong-encryption-key

# 赞助钱包私钥 (预存 BNB)
SPONSOR_WALLET_PRIVATE_KEY=0x...
```

---

## 依赖安装

```bash
npm install ethers dotenv
```

---

## API 端点设计

```
POST /ai-agents              # 创建 AI 代理 (自动生成钱包 + 赞助)
GET  /ai-agents              # 列出所有代理
GET  /ai-agents/:name        # 获取代理详情
POST /ai-agents/:name/action # AI 代理执行链上操作
GET  /ai-agents/:name/balance # 获取代理余额
```

---

## 快速开始模板

1. 复制以上代码到你的项目
2. 配置 `.env` 环境变量
3. 部署智能合约 (如需要)
4. 启动服务，创建第一个 AI 代理

```javascript
// 使用示例
const walletService = new AIAgentWalletService({
  rpcUrl: process.env.RPC_URL,
  encryptionKey: process.env.WALLET_ENCRYPTION_KEY,
  contractAddress: process.env.CONTRACT_ADDRESS
});

const sponsorService = new GasSponsorService({
  rpcUrl: process.env.RPC_URL,
  sponsorPrivateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY
});

// 创建 AI 代理
const agent = await walletService.createAgentWallet('MyAIAgent');
await sponsorService.sponsorAgent(agent.address, agent.agentName);

// AI 代理执行链上操作
const result = await walletService.executeContractCall(
  'MyAIAgent',
  'mint',
  ['参数1', '参数2']
);
console.log('交易哈希:', result.txHash);
```

---

## 适用场景

- 🤖 AI Agent 自主交易
- 🎮 游戏 NPC 链上资产
- 📊 自动化交易机器人
- 🔮 预测市场代理
- 🏦 DeFi 自动化策略
