/**
 * GasSponsorService.js
 * Gas 赞助服务 - 为新 AI 代理提供初始 gas 费用
 * 
 * 功能：
 * 1. 维护赞助钱包
 * 2. 为新代理转账少量 BNB
 * 3. 防止滥用（限制频率）
 */

const { ethers } = require('ethers');

class GasSponsorService {
    constructor(config = {}) {
        // 网络配置
        this.rpcUrl = config.rpcUrl || 'https://opbnb-testnet-rpc.bnbchain.org';
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

        // 赞助钱包 (需要配置私钥)
        this.sponsorPrivateKey = config.sponsorPrivateKey || process.env.SPONSOR_WALLET_PRIVATE_KEY;
        this.sponsorWallet = null;

        if (this.sponsorPrivateKey) {
            this.sponsorWallet = new ethers.Wallet(this.sponsorPrivateKey, this.provider);
        }

        // 赞助金额 (默认 0.002 BNB，够铸造 + 几次预测)
        this.sponsorAmount = ethers.parseEther(config.sponsorAmount || '0.002');

        // 最低赞助余额 (低于此值不再赞助)
        this.minSponsorBalance = ethers.parseEther(config.minSponsorBalance || '0.1');

        // 赞助记录 (防止重复赞助)
        this.sponsoredAddresses = new Map(); // address => timestamp

        // 赞助冷却时间 (24小时)
        this.cooldownMs = config.cooldownMs || 24 * 60 * 60 * 1000;
    }

    /**
     * 获取赞助钱包信息
     */
    async getSponsorInfo() {
        if (!this.sponsorWallet) {
            return {
                configured: false,
                message: 'Sponsor wallet not configured'
            };
        }

        const balance = await this.provider.getBalance(this.sponsorWallet.address);

        return {
            configured: true,
            address: this.sponsorWallet.address,
            balance: ethers.formatEther(balance),
            sponsorAmount: ethers.formatEther(this.sponsorAmount),
            canSponsor: balance >= this.minSponsorBalance
        };
    }

    /**
     * 为新代理赞助 gas
     * @param {string} recipientAddress - 接收地址
     * @param {string} agentName - 代理名称 (用于日志)
     * @returns {Object} 赞助结果
     */
    async sponsorAgent(recipientAddress, agentName = 'unknown') {
        if (!this.sponsorWallet) {
            throw new Error('Sponsor wallet not configured. Set SPONSOR_WALLET_PRIVATE_KEY');
        }

        // 检查是否已赞助过
        const lastSponsored = this.sponsoredAddresses.get(recipientAddress);
        if (lastSponsored && (Date.now() - lastSponsored) < this.cooldownMs) {
            const remainingHours = Math.ceil((this.cooldownMs - (Date.now() - lastSponsored)) / 3600000);
            throw new Error(`Address already sponsored. Try again in ${remainingHours} hours`);
        }

        // 检查赞助钱包余额
        const sponsorBalance = await this.provider.getBalance(this.sponsorWallet.address);
        if (sponsorBalance < this.sponsorAmount) {
            throw new Error('Sponsor wallet has insufficient balance');
        }

        // 检查接收者当前余额 (如果已有足够余额则不赞助)
        const recipientBalance = await this.provider.getBalance(recipientAddress);
        if (recipientBalance >= this.sponsorAmount) {
            return {
                success: true,
                sponsored: false,
                message: 'Recipient already has sufficient balance',
                currentBalance: ethers.formatEther(recipientBalance)
            };
        }

        console.log(`💰 赞助 AI 代理 "${agentName}"...`);
        console.log(`   📍 接收地址: ${recipientAddress}`);
        console.log(`   💸 赞助金额: ${ethers.formatEther(this.sponsorAmount)} BNB`);

        // 发送赞助交易
        const tx = await this.sponsorWallet.sendTransaction({
            to: recipientAddress,
            value: this.sponsorAmount
        });

        console.log(`   ⏳ 等待确认... TX: ${tx.hash}`);
        const receipt = await tx.wait();

        // 记录赞助
        this.sponsoredAddresses.set(recipientAddress, Date.now());

        console.log(`   ✅ 赞助成功!`);

        return {
            success: true,
            sponsored: true,
            agentName,
            recipientAddress,
            amount: ethers.formatEther(this.sponsorAmount),
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    /**
     * 批量赞助多个代理
     * @param {Array} agents - 代理列表 [{address, name}, ...]
     * @returns {Array} 结果列表
     */
    async batchSponsor(agents) {
        const results = [];

        for (const agent of agents) {
            try {
                const result = await this.sponsorAgent(agent.address, agent.name);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    agentName: agent.name,
                    address: agent.address,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 清除过期的赞助记录
     */
    cleanupSponsorRecords() {
        const now = Date.now();
        for (const [address, timestamp] of this.sponsoredAddresses) {
            if (now - timestamp > this.cooldownMs) {
                this.sponsoredAddresses.delete(address);
            }
        }
    }
}

module.exports = GasSponsorService;
