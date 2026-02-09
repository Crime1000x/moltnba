// scripts/deploy.js
// 部署 MoltNBA NFA 智能合约到 opBNB/BSC

const hre = require("hardhat");

async function main() {
    console.log("🚀 开始部署 MoltNBA NFA 智能合约...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 部署账户:", deployer.address);
    console.log("💰 账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB\n");

    // 1. 部署 MoltNFAToken 主合约
    console.log("1️⃣ 部署 MoltNFAToken...");
    const MoltNFAToken = await hre.ethers.getContractFactory("MoltNFAToken");
    const nfaToken = await MoltNFAToken.deploy();
    await nfaToken.waitForDeployment();
    const nfaTokenAddress = await nfaToken.getAddress();
    console.log("   ✅ MoltNFAToken 部署到:", nfaTokenAddress);

    // 2. 部署 PredictionLogic 合约
    console.log("\n2️⃣ 部署 PredictionLogic...");
    const PredictionLogic = await hre.ethers.getContractFactory("PredictionLogic");
    const predictionLogic = await PredictionLogic.deploy(nfaTokenAddress);
    await predictionLogic.waitForDeployment();
    const predictionLogicAddress = await predictionLogic.getAddress();
    console.log("   ✅ PredictionLogic 部署到:", predictionLogicAddress);

    // 3. 部署 SimpleLearningModule 合约
    console.log("\n3️⃣ 部署 SimpleLearningModule...");
    const SimpleLearningModule = await hre.ethers.getContractFactory("SimpleLearningModule");
    const learningModule = await SimpleLearningModule.deploy(nfaTokenAddress);
    await learningModule.waitForDeployment();
    const learningModuleAddress = await learningModule.getAddress();
    console.log("   ✅ SimpleLearningModule 部署到:", learningModuleAddress);

    // 4. 配置合约关联
    console.log("\n4️⃣ 配置合约关联...");

    // 设置学习模块
    const setLearningModuleTx = await nfaToken.setLearningModule(learningModuleAddress);
    await setLearningModuleTx.wait();
    console.log("   ✅ NFA Token 已关联 Learning Module");

    // 添加部署者为结算者
    const addSettlerTx = await predictionLogic.addSettler(deployer.address);
    await addSettlerTx.wait();
    console.log("   ✅ 部署者已添加为预测结算者");

    // 输出部署摘要
    console.log("\n" + "=".repeat(60));
    console.log("📋 部署摘要");
    console.log("=".repeat(60));
    console.log(`🎯 MoltNFAToken:        ${nfaTokenAddress}`);
    console.log(`📊 PredictionLogic:     ${predictionLogicAddress}`);
    console.log(`🧠 SimpleLearningModule: ${learningModuleAddress}`);
    console.log("=".repeat(60));

    // 保存部署地址到文件
    const fs = require("fs");
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: {
            MoltNFAToken: nfaTokenAddress,
            PredictionLogic: predictionLogicAddress,
            SimpleLearningModule: learningModuleAddress
        }
    };

    const deploymentPath = `./deployments/${hre.network.name}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 部署信息已保存到: ${deploymentPath}`);

    // 验证提示
    console.log("\n📝 合约验证命令:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${nfaTokenAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${predictionLogicAddress} "${nfaTokenAddress}"`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${learningModuleAddress} "${nfaTokenAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });
