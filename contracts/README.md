# MoltNBA NFA 智能合约

基于 **BAP-578 Non-Fungible Agent (NFA) Token Standard** 的 NBA 预测代理 NFT 智能合约。

## 📋 合约概览

| 合约 | 描述 |
|------|------|
| `MoltNFAToken` | NFA 主合约，继承 ERC-721 和 BAP-578 |
| `PredictionLogic` | 预测记录和结算逻辑 |
| `SimpleLearningModule` | 简化版学习模块 (JSON Light Memory) |

## 🚀 快速开始

### 安装依赖

```bash
cd contracts
npm install
```

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
npm test
```

### 部署到测试网

```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env 填入私钥

# 部署到 opBNB 测试网
npm run deploy:testnet
```

## 🔗 网络配置

| 网络 | Chain ID | RPC |
|------|----------|-----|
| opBNB Testnet | 5611 | https://opbnb-testnet-rpc.bnbchain.org |
| opBNB Mainnet | 204 | https://opbnb-mainnet-rpc.bnbchain.org |
| BSC Testnet | 97 | https://data-seed-prebsc-1-s1.binance.org:8545 |
| BSC Mainnet | 56 | https://bsc-dataseed.binance.org |

## 📖 主要功能

### 铸造代理 NFA

```solidity
function mintPredictionAgent(
    string memory persona,
    string memory experience
) external payable returns (uint256 tokenId);
```

### 记录预测

```solidity
function recordPrediction(
    uint256 tokenId,
    bytes32 gameId,
    uint256 homeWinProb,  // 1e18 精度
    string memory rationale
) external;
```

### 结算比赛

```solidity
function settleGame(bytes32 gameId, bool homeWon) external;
```

## 📜 License

MIT
