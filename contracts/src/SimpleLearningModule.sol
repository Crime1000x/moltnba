// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILearningModule.sol";

/**
 * @title SimpleLearningModule - 简化版学习模块
 * @dev 实现 BAP-578 学习模块接口的简化版本 (JSON Light Memory 路径)
 * @notice 适用于快速部署，后续可升级到 Merkle Tree Learning
 */
contract SimpleLearningModule is ILearningModule, Ownable {
    // ============ 状态变量 ============
    
    // NFA 合约地址
    address public nfaContract;
    
    // 代理学习数据: tokenId => LearningData
    struct LearningData {
        bool enabled;                 // 是否启用学习
        bytes32 learningRoot;         // 学习状态根哈希
        uint256 version;              // 学习版本
        uint256 totalInteractions;    // 总交互次数
        uint256 learningEvents;       // 学习事件数
        uint256 lastUpdateTimestamp;  // 最后更新时间
        uint256 successfulActions;    // 成功动作数
        string strategyHash;          // 策略哈希 (IPFS)
    }
    
    mapping(uint256 => LearningData) private _learningData;
    
    // 交互类型统计
    mapping(uint256 => mapping(string => uint256)) private _interactionCounts;

    // ============ 事件 ============
    
    event LearningEnabled(uint256 indexed tokenId);
    event LearningUpdated(uint256 indexed tokenId, bytes32 newRoot, uint256 version);
    event InteractionRecorded(uint256 indexed tokenId, string interactionType, bool success);
    event StrategyUpdated(uint256 indexed tokenId, string strategyHash);

    // ============ 修饰器 ============
    
    modifier onlyNFAContract() {
        require(msg.sender == nfaContract || msg.sender == owner(), "Not authorized");
        _;
    }

    // ============ 构造函数 ============
    
    constructor(address _nfaContract) Ownable(msg.sender) {
        nfaContract = _nfaContract;
    }

    // ============ ILearningModule 实现 ============

    /**
     * @dev 更新学习状态
     */
    function updateLearning(uint256 tokenId, LearningUpdate calldata update) 
        external 
        override 
        onlyNFAContract 
    {
        LearningData storage data = _learningData[tokenId];
        
        // 验证前一个根
        if (data.version > 0) {
            require(data.learningRoot == update.previousRoot, "Invalid previous root");
        }
        
        data.learningRoot = update.newRoot;
        data.version++;
        data.learningEvents++;
        data.lastUpdateTimestamp = block.timestamp;
        
        emit LearningUpdated(tokenId, update.newRoot, data.version);
    }

    /**
     * @dev 验证学习声明 (简化版：直接比较哈希)
     */
    function verifyLearning(uint256 tokenId, bytes32 claim, bytes32[] calldata /* proof */) 
        external 
        view 
        override 
        returns (bool) 
    {
        // 简化版实现：直接比较 claim 和 learningRoot
        return _learningData[tokenId].learningRoot == claim;
    }

    /**
     * @dev 获取学习指标
     */
    function getLearningMetrics(uint256 tokenId) 
        external 
        view 
        override 
        returns (LearningMetrics memory) 
    {
        LearningData memory data = _learningData[tokenId];
        
        // 计算学习速率和置信度
        uint256 velocity = 0;
        uint256 confidence = 0;
        
        if (data.totalInteractions > 0) {
            // 简化计算：成功率作为置信度
            confidence = (data.successfulActions * 1e18) / data.totalInteractions;
            
            // 学习速率：学习事件 / 总交互
            velocity = (data.learningEvents * 1e18) / data.totalInteractions;
        }
        
        return LearningMetrics({
            totalInteractions: data.totalInteractions,
            learningEvents: data.learningEvents,
            lastUpdateTimestamp: data.lastUpdateTimestamp,
            learningVelocity: velocity,
            confidenceScore: confidence
        });
    }

    /**
     * @dev 获取学习根
     */
    function getLearningRoot(uint256 tokenId) external view override returns (bytes32) {
        return _learningData[tokenId].learningRoot;
    }

    /**
     * @dev 是否启用学习
     */
    function isLearningEnabled(uint256 tokenId) external view override returns (bool) {
        return _learningData[tokenId].enabled;
    }

    /**
     * @dev 获取版本
     */
    function getVersion() external pure override returns (string memory) {
        return "SimpleLearningModule v1.0.0 (JSON Light Memory)";
    }

    /**
     * @dev 记录交互
     */
    function recordInteraction(uint256 tokenId, string calldata interactionType, bool success) 
        external 
        override 
        onlyNFAContract 
    {
        LearningData storage data = _learningData[tokenId];
        
        data.totalInteractions++;
        _interactionCounts[tokenId][interactionType]++;
        
        if (success) {
            data.successfulActions++;
        }
        
        data.lastUpdateTimestamp = block.timestamp;
        
        emit InteractionRecorded(tokenId, interactionType, success);
    }

    // ============ 额外功能 ============

    /**
     * @dev 启用代理学习
     */
    function enableLearning(uint256 tokenId) external onlyNFAContract {
        _learningData[tokenId].enabled = true;
        _learningData[tokenId].lastUpdateTimestamp = block.timestamp;
        emit LearningEnabled(tokenId);
    }

    /**
     * @dev 更新策略哈希
     */
    function updateStrategy(uint256 tokenId, string calldata strategyHash) external onlyNFAContract {
        _learningData[tokenId].strategyHash = strategyHash;
        _learningData[tokenId].learningEvents++;
        emit StrategyUpdated(tokenId, strategyHash);
    }

    /**
     * @dev 获取完整学习数据
     */
    function getLearningData(uint256 tokenId) external view returns (
        bool enabled,
        bytes32 learningRoot,
        uint256 version,
        uint256 totalInteractions,
        uint256 successfulActions,
        string memory strategyHash
    ) {
        LearningData memory data = _learningData[tokenId];
        return (
            data.enabled,
            data.learningRoot,
            data.version,
            data.totalInteractions,
            data.successfulActions,
            data.strategyHash
        );
    }

    /**
     * @dev 获取交互类型统计
     */
    function getInteractionCount(uint256 tokenId, string calldata interactionType) 
        external view returns (uint256) 
    {
        return _interactionCounts[tokenId][interactionType];
    }

    // ============ 管理函数 ============

    function setNFAContract(address _nfaContract) external onlyOwner {
        nfaContract = _nfaContract;
    }
}
