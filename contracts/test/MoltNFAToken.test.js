// test/MoltNFAToken.test.js
// MoltNBA NFA 智能合约测试

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MoltNFAToken", function () {
    let nfaToken;
    let predictionLogic;
    let learningModule;
    let owner;
    let user1;
    let user2;

    const MINT_PRICE = ethers.parseEther("0.001");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 部署 NFA Token
        const MoltNFAToken = await ethers.getContractFactory("MoltNFAToken");
        nfaToken = await MoltNFAToken.deploy();
        await nfaToken.waitForDeployment();

        // 部署 PredictionLogic
        const PredictionLogic = await ethers.getContractFactory("PredictionLogic");
        predictionLogic = await PredictionLogic.deploy(await nfaToken.getAddress());
        await predictionLogic.waitForDeployment();

        // 部署 SimpleLearningModule
        const SimpleLearningModule = await ethers.getContractFactory("SimpleLearningModule");
        learningModule = await SimpleLearningModule.deploy(await nfaToken.getAddress());
        await learningModule.waitForDeployment();

        // 配置
        await nfaToken.setLearningModule(await learningModule.getAddress());
        await predictionLogic.addSettler(owner.address);
    });

    describe("铸造测试", function () {
        it("应该能成功铸造 NFA", async function () {
            const persona = JSON.stringify({ name: "TestAgent", style: "analytical" });
            const experience = "NBA prediction specialist";

            await nfaToken.connect(user1).mintPredictionAgent(persona, experience, {
                value: MINT_PRICE
            });

            expect(await nfaToken.balanceOf(user1.address)).to.equal(1);
            expect(await nfaToken.ownerOf(1)).to.equal(user1.address);
        });

        it("铸造价格不足应该失败", async function () {
            await expect(
                nfaToken.connect(user1).mintPredictionAgent("Test", "Test", {
                    value: ethers.parseEther("0.0001")
                })
            ).to.be.revertedWith("Insufficient mint price");
        });

        it("管理员可以免费铸造", async function () {
            await nfaToken.mintFree(user1.address, "Admin Agent", "Premium experience");
            expect(await nfaToken.ownerOf(1)).to.equal(user1.address);
        });
    });

    describe("代理状态测试", function () {
        beforeEach(async function () {
            await nfaToken.connect(user1).mintPredictionAgent("Test", "Test", {
                value: MINT_PRICE
            });
        });

        it("应该能获取代理状态", async function () {
            const state = await nfaToken.getState(1);
            expect(state.status).to.equal(0); // Active
            expect(state.owner).to.equal(user1.address);
        });

        it("应该能暂停代理", async function () {
            await nfaToken.connect(user1).pause(1);
            const state = await nfaToken.getState(1);
            expect(state.status).to.equal(1); // Paused
        });

        it("应该能恢复代理", async function () {
            await nfaToken.connect(user1).pause(1);
            await nfaToken.connect(user1).unpause(1);
            const state = await nfaToken.getState(1);
            expect(state.status).to.equal(0); // Active
        });

        it("应该能终止代理", async function () {
            await nfaToken.connect(user1).terminate(1);
            const state = await nfaToken.getState(1);
            expect(state.status).to.equal(2); // Terminated
        });
    });

    describe("预测记录测试", function () {
        beforeEach(async function () {
            await nfaToken.connect(user1).mintPredictionAgent("Test", "Test", {
                value: MINT_PRICE
            });
        });

        it("应该能记录预测", async function () {
            const gameId = ethers.keccak256(ethers.toUtf8Bytes("game123"));
            const probability = ethers.parseEther("0.65"); // 65%

            await expect(
                nfaToken.connect(user1).recordPrediction(1, gameId, probability, "ipfs://rationale")
            ).to.emit(nfaToken, "PredictionRecorded");
        });

        it("概率超过 100% 应该失败", async function () {
            const gameId = ethers.keccak256(ethers.toUtf8Bytes("game123"));
            const probability = ethers.parseEther("1.5"); // 150%

            await expect(
                nfaToken.connect(user1).recordPrediction(1, gameId, probability, "")
            ).to.be.revertedWith("Probability exceeds 100%");
        });

        it("非所有者不能记录预测", async function () {
            const gameId = ethers.keccak256(ethers.toUtf8Bytes("game123"));

            await expect(
                nfaToken.connect(user2).recordPrediction(1, gameId, ethers.parseEther("0.5"), "")
            ).to.be.revertedWith("Not agent owner");
        });
    });

    describe("充值测试", function () {
        beforeEach(async function () {
            await nfaToken.connect(user1).mintPredictionAgent("Test", "Test", {
                value: MINT_PRICE
            });
        });

        it("应该能为代理充值", async function () {
            const fundAmount = ethers.parseEther("0.1");

            await nfaToken.connect(user2).fundAgent(1, { value: fundAmount });

            const state = await nfaToken.getState(1);
            expect(state.balance).to.equal(fundAmount);
        });
    });

    describe("元数据测试", function () {
        beforeEach(async function () {
            await nfaToken.connect(user1).mintPredictionAgent("Test Persona", "Test Experience", {
                value: MINT_PRICE
            });
        });

        it("应该能获取元数据", async function () {
            const metadata = await nfaToken.getAgentMetadata(1);
            expect(metadata.persona).to.equal("Test Persona");
            expect(metadata.experience).to.equal("Test Experience");
        });

        it("应该能更新元数据", async function () {
            const newMetadata = {
                persona: "Updated Persona",
                experience: "Updated Experience",
                voiceHash: "voice123",
                animationURI: "https://example.com/animation",
                vaultURI: "https://vault.example.com",
                vaultHash: ethers.keccak256(ethers.toUtf8Bytes("vault"))
            };

            await nfaToken.connect(user1).updateAgentMetadata(1, newMetadata);

            const metadata = await nfaToken.getAgentMetadata(1);
            expect(metadata.persona).to.equal("Updated Persona");
        });
    });
});

describe("PredictionLogic", function () {
    let nfaToken;
    let predictionLogic;
    let owner;
    let user1;

    const MINT_PRICE = ethers.parseEther("0.001");

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        const MoltNFAToken = await ethers.getContractFactory("MoltNFAToken");
        nfaToken = await MoltNFAToken.deploy();
        await nfaToken.waitForDeployment();

        const PredictionLogic = await ethers.getContractFactory("PredictionLogic");
        predictionLogic = await PredictionLogic.deploy(await nfaToken.getAddress());
        await predictionLogic.waitForDeployment();

        await predictionLogic.addSettler(owner.address);

        // 铸造代理
        await nfaToken.connect(user1).mintPredictionAgent("Test", "Test", {
            value: MINT_PRICE
        });
    });

    it("应该能创建预测", async function () {
        const gameId = ethers.keccak256(ethers.toUtf8Bytes("LAL-vs-GSW-20250210"));
        const probability = ethers.parseEther("0.7"); // 70%

        await expect(
            predictionLogic.makePrediction(1, gameId, probability, "ipfs://rationale")
        ).to.emit(predictionLogic, "PredictionMade");

        const stats = await predictionLogic.agentStats(1);
        expect(stats.totalPredictions).to.equal(1);
        expect(stats.pendingPredictions).to.equal(1);
    });

    it("应该能结算比赛", async function () {
        const gameId = ethers.keccak256(ethers.toUtf8Bytes("game1"));

        // 创建预测 (预测主队赢, 70%)
        await predictionLogic.makePrediction(1, gameId, ethers.parseEther("0.7"), "");

        // 结算 (主队确实赢了)
        await predictionLogic.settleGame(gameId, true);

        const stats = await predictionLogic.agentStats(1);
        expect(stats.correctPredictions).to.equal(1);
        expect(stats.pendingPredictions).to.equal(0);
    });

    it("应该正确计算准确率", async function () {
        const game1 = ethers.keccak256(ethers.toUtf8Bytes("game1"));
        const game2 = ethers.keccak256(ethers.toUtf8Bytes("game2"));

        // 两个预测
        await predictionLogic.makePrediction(1, game1, ethers.parseEther("0.7"), ""); // 预测主队赢
        await predictionLogic.makePrediction(1, game2, ethers.parseEther("0.3"), ""); // 预测客队赢

        // 结算
        await predictionLogic.settleGame(game1, true);  // 主队赢 - 正确
        await predictionLogic.settleGame(game2, false); // 客队赢 - 正确

        const accuracy = await predictionLogic.getAgentAccuracy(1);
        expect(accuracy).to.equal(ethers.parseEther("1")); // 100% 准确率
    });
});

describe("SimpleLearningModule", function () {
    let nfaToken;
    let learningModule;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const MoltNFAToken = await ethers.getContractFactory("MoltNFAToken");
        nfaToken = await MoltNFAToken.deploy();
        await nfaToken.waitForDeployment();

        const SimpleLearningModule = await ethers.getContractFactory("SimpleLearningModule");
        learningModule = await SimpleLearningModule.deploy(await nfaToken.getAddress());
        await learningModule.waitForDeployment();
    });

    it("应该返回正确的版本", async function () {
        const version = await learningModule.getVersion();
        expect(version).to.include("SimpleLearningModule");
    });

    it("应该能记录交互", async function () {
        await learningModule.recordInteraction(1, "prediction", true);

        const metrics = await learningModule.getLearningMetrics(1);
        expect(metrics.totalInteractions).to.equal(1);
    });
});
