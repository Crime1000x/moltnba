// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILearningModule - 学习模块接口
 * @dev BAP-578 学习模块标准接口
 */
interface ILearningModule {
    // 学习指标结构
    struct LearningMetrics {
        uint256 totalInteractions;    // 总交互次数
        uint256 learningEvents;       // 重要学习更新次数
        uint256 lastUpdateTimestamp;  // 最后学习更新时间
        uint256 learningVelocity;     // 学习速率 (1e18 精度)
        uint256 confidenceScore;      // 总体置信度 (1e18 精度)
    }

    // 学习更新结构
    struct LearningUpdate {
        bytes32 previousRoot;  // 前一个 Merkle 根
        bytes32 newRoot;       // 新 Merkle 根
        bytes32 proof;         // 更新的 Merkle 证明
        bytes32 metadata;      // 编码的学习数据
    }

    // 更新学习状态
    function updateLearning(uint256 tokenId, LearningUpdate calldata update) external;
    
    // 验证学习声明
    function verifyLearning(uint256 tokenId, bytes32 claim, bytes32[] calldata proof) external view returns (bool);
    
    // 获取学习指标
    function getLearningMetrics(uint256 tokenId) external view returns (LearningMetrics memory);
    
    // 获取学习根
    function getLearningRoot(uint256 tokenId) external view returns (bytes32);
    
    // 是否启用学习
    function isLearningEnabled(uint256 tokenId) external view returns (bool);
    
    // 获取版本
    function getVersion() external pure returns (string memory);
    
    // 记录交互
    function recordInteraction(uint256 tokenId, string calldata interactionType, bool success) external;
}
