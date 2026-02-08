// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBAP578 - Non-Fungible Agent (NFA) Token Standard Interface
 * @dev BAP-578 标准接口，扩展 ERC-721 以支持自主 AI 代理
 */
interface IBAP578 {
    // 代理状态枚举
    enum Status { Active, Paused, Terminated }

    // 代理状态结构
    struct State {
        uint256 balance;           // 代理 BNB 余额
        Status status;             // 当前操作状态
        address owner;             // 代理所有者地址
        address logicAddress;      // 逻辑合约地址
        uint256 lastActionTimestamp; // 最后动作执行时间
    }

    // 代理元数据结构
    struct AgentMetadata {
        string persona;        // JSON 编码的角色特征
        string experience;     // 代理角色/目的摘要
        string voiceHash;      // 音频配置文件引用
        string animationURI;   // 动画/头像 URI
        string vaultURI;       // 扩展数据存储 URI
        bytes32 vaultHash;     // Vault 内容验证哈希
    }

    // 事件
    event ActionExecuted(address indexed agent, bytes result);
    event LogicUpgraded(address indexed agent, address oldLogic, address newLogic);
    event AgentFunded(address indexed agent, address indexed funder, uint256 amount);
    event StatusChanged(address indexed agent, Status newStatus);
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);

    // 核心函数
    function executeAction(uint256 tokenId, bytes calldata data) external;
    function setLogicAddress(uint256 tokenId, address newLogic) external;
    function fundAgent(uint256 tokenId) external payable;
    function getState(uint256 tokenId) external view returns (State memory);
    function getAgentMetadata(uint256 tokenId) external view returns (AgentMetadata memory);
    function updateAgentMetadata(uint256 tokenId, AgentMetadata memory metadata) external;

    // 生命周期管理
    function pause(uint256 tokenId) external;
    function unpause(uint256 tokenId) external;
    function terminate(uint256 tokenId) external;
}
