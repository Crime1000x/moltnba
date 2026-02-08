// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionLogic - 预测逻辑合约
 * @dev 管理 NFA 代理的预测记录和结算
 */
contract PredictionLogic is Ownable {
    // ============ 结构体 ============
    
    struct Prediction {
        uint256 agentId;             // 代理 ID
        bytes32 gameId;              // 比赛 ID
        uint256 homeWinProbability;  // 主队获胜概率 (1e18 精度)
        uint256 timestamp;           // 预测时间戳
        bool isSettled;              // 是否已结算
        bool isCorrect;              // 预测是否正确
        string rationaleHash;        // 理由哈希 (IPFS)
    }

    struct AgentStats {
        uint256 totalPredictions;    // 总预测数
        uint256 correctPredictions;  // 正确预测数
        uint256 pendingPredictions;  // 待结算预测数
        uint256 lastPredictionTime;  // 最后预测时间
    }

    struct GameResult {
        bool isFinished;             // 比赛是否结束
        bool homeWon;                // 主队是否获胜
        uint256 settledAt;           // 结算时间
    }

    // ============ 状态变量 ============
    
    // NFA 合约地址
    address public nfaContract;
    
    // 预测 ID 计数器
    uint256 private _nextPredictionId;
    
    // 预测映射: predictionId => Prediction
    mapping(uint256 => Prediction) public predictions;
    
    // 代理预测列表: agentId => predictionIds
    mapping(uint256 => uint256[]) public agentPredictions;
    
    // 比赛预测列表: gameId => predictionIds
    mapping(bytes32 => uint256[]) public gamePredictions;
    
    // 代理统计: agentId => AgentStats
    mapping(uint256 => AgentStats) public agentStats;
    
    // 比赛结果: gameId => GameResult
    mapping(bytes32 => GameResult) public gameResults;
    
    // 授权的结算者
    mapping(address => bool) public authorizedSettlers;

    // ============ 事件 ============
    
    event PredictionMade(
        uint256 indexed predictionId,
        uint256 indexed agentId,
        bytes32 indexed gameId,
        uint256 probability,
        uint256 timestamp
    );
    
    event PredictionSettled(
        uint256 indexed predictionId,
        uint256 indexed agentId,
        bytes32 indexed gameId,
        bool isCorrect
    );
    
    event GameSettled(
        bytes32 indexed gameId,
        bool homeWon,
        uint256 totalPredictions
    );

    // ============ 修饰器 ============
    
    modifier onlyNFAContract() {
        require(msg.sender == nfaContract, "Only NFA contract");
        _;
    }
    
    modifier onlySettler() {
        require(authorizedSettlers[msg.sender] || msg.sender == owner(), "Not authorized settler");
        _;
    }

    // ============ 构造函数 ============
    
    constructor(address _nfaContract) Ownable(msg.sender) {
        nfaContract = _nfaContract;
        _nextPredictionId = 1;
    }

    // ============ 预测函数 ============

    /**
     * @dev 创建预测
     * @param agentId 代理 ID
     * @param gameId 比赛 ID
     * @param probability 主队获胜概率 (1e18 精度)
     * @param rationaleHash 理由哈希
     * @return predictionId 预测 ID
     */
    function makePrediction(
        uint256 agentId,
        bytes32 gameId,
        uint256 probability,
        string calldata rationaleHash
    ) external returns (uint256) {
        require(probability <= 1e18, "Probability exceeds 100%");
        require(!gameResults[gameId].isFinished, "Game already finished");
        
        uint256 predictionId = _nextPredictionId++;
        
        predictions[predictionId] = Prediction({
            agentId: agentId,
            gameId: gameId,
            homeWinProbability: probability,
            timestamp: block.timestamp,
            isSettled: false,
            isCorrect: false,
            rationaleHash: rationaleHash
        });
        
        agentPredictions[agentId].push(predictionId);
        gamePredictions[gameId].push(predictionId);
        
        AgentStats storage stats = agentStats[agentId];
        stats.totalPredictions++;
        stats.pendingPredictions++;
        stats.lastPredictionTime = block.timestamp;
        
        emit PredictionMade(predictionId, agentId, gameId, probability, block.timestamp);
        
        return predictionId;
    }

    // ============ 结算函数 ============

    /**
     * @dev 结算比赛
     * @param gameId 比赛 ID
     * @param homeWon 主队是否获胜
     */
    function settleGame(bytes32 gameId, bool homeWon) external onlySettler {
        require(!gameResults[gameId].isFinished, "Game already settled");
        
        gameResults[gameId] = GameResult({
            isFinished: true,
            homeWon: homeWon,
            settledAt: block.timestamp
        });
        
        // 结算所有该比赛的预测
        uint256[] storage predictionIds = gamePredictions[gameId];
        
        for (uint256 i = 0; i < predictionIds.length; i++) {
            _settlePrediction(predictionIds[i], homeWon);
        }
        
        emit GameSettled(gameId, homeWon, predictionIds.length);
    }

    /**
     * @dev 内部结算预测
     */
    function _settlePrediction(uint256 predictionId, bool homeWon) internal {
        Prediction storage pred = predictions[predictionId];
        
        if (pred.isSettled) return;
        
        pred.isSettled = true;
        
        // 判断预测是否正确 (概率 > 50% 预测主队赢)
        bool predictedHomeWin = pred.homeWinProbability > 5e17;
        pred.isCorrect = (predictedHomeWin == homeWon);
        
        AgentStats storage stats = agentStats[pred.agentId];
        stats.pendingPredictions--;
        
        if (pred.isCorrect) {
            stats.correctPredictions++;
        }
        
        emit PredictionSettled(predictionId, pred.agentId, pred.gameId, pred.isCorrect);
    }

    // ============ 查询函数 ============

    /**
     * @dev 获取代理准确率 (1e18 精度)
     */
    function getAgentAccuracy(uint256 agentId) external view returns (uint256) {
        AgentStats memory stats = agentStats[agentId];
        
        uint256 settledCount = stats.totalPredictions - stats.pendingPredictions;
        if (settledCount == 0) return 0;
        
        return (stats.correctPredictions * 1e18) / settledCount;
    }

    /**
     * @dev 获取代理所有预测
     */
    function getAgentPredictions(uint256 agentId) external view returns (uint256[] memory) {
        return agentPredictions[agentId];
    }

    /**
     * @dev 获取比赛所有预测
     */
    function getGamePredictions(bytes32 gameId) external view returns (uint256[] memory) {
        return gamePredictions[gameId];
    }

    /**
     * @dev 获取预测详情
     */
    function getPrediction(uint256 predictionId) external view returns (Prediction memory) {
        return predictions[predictionId];
    }

    /**
     * @dev 总预测数
     */
    function totalPredictions() external view returns (uint256) {
        return _nextPredictionId - 1;
    }

    // ============ 管理函数 ============

    function setNFAContract(address _nfaContract) external onlyOwner {
        nfaContract = _nfaContract;
    }

    function addSettler(address settler) external onlyOwner {
        authorizedSettlers[settler] = true;
    }

    function removeSettler(address settler) external onlyOwner {
        authorizedSettlers[settler] = false;
    }
}
