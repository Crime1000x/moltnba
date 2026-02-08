// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IBAP578.sol";
import "./interfaces/ILearningModule.sol";

/**
 * @title MoltNFAToken - MoltNBA 预测代理 NFA 代币
 * @dev 实现 BAP-578 NFA 标准的预测代理 NFT
 * @notice 每个 NFA 代表一个可以进行 NBA 比赛预测的 AI 代理
 */
contract MoltNFAToken is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, IBAP578 {
    // ============ 常量 ============
    uint256 public constant MAX_GAS_FOR_DELEGATECALL = 3000000;
    uint256 public constant MINT_PRICE = 0.001 ether; // 铸造价格

    // ============ 状态变量 ============
    uint256 private _nextTokenId;
    
    // 代理状态映射
    mapping(uint256 => State) private _agentStates;
    
    // 代理元数据映射
    mapping(uint256 => AgentMetadata) private _agentMetadata;
    
    // 学习模块地址
    address public learningModule;
    
    // 全局暂停状态
    bool public globalPaused;

    // ============ 事件 ============
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string persona);
    event PredictionRecorded(uint256 indexed tokenId, bytes32 indexed gameId, uint256 homeWinProb);

    // ============ 修饰器 ============
    modifier onlyAgentOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        _;
    }

    modifier whenNotPaused(uint256 tokenId) {
        require(!globalPaused, "Globally paused");
        require(_agentStates[tokenId].status == Status.Active, "Agent not active");
        _;
    }

    modifier agentExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        _;
    }

    // ============ 构造函数 ============
    constructor() ERC721("MoltNBA Prediction Agent", "MOLT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    // ============ 铸造函数 ============
    
    /**
     * @dev 铸造新的预测代理 NFA
     * @param persona 代理角色描述 (JSON 格式)
     * @param experience 代理经验/专长描述
     * @return tokenId 新铸造的代理 ID
     */
    function mintPredictionAgent(
        string memory persona,
        string memory experience
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= MINT_PRICE, "Insufficient mint price");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        // 初始化代理状态
        _agentStates[tokenId] = State({
            balance: 0,
            status: Status.Active,
            owner: msg.sender,
            logicAddress: address(0),
            lastActionTimestamp: block.timestamp
        });
        
        // 设置代理元数据
        _agentMetadata[tokenId] = AgentMetadata({
            persona: persona,
            experience: experience,
            voiceHash: "",
            animationURI: "",
            vaultURI: "",
            vaultHash: bytes32(0)
        });
        
        emit AgentMinted(tokenId, msg.sender, persona);
        
        return tokenId;
    }

    /**
     * @dev 免费铸造 (仅管理员)
     */
    function mintFree(
        address to,
        string memory persona,
        string memory experience
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        _agentStates[tokenId] = State({
            balance: 0,
            status: Status.Active,
            owner: to,
            logicAddress: address(0),
            lastActionTimestamp: block.timestamp
        });
        
        _agentMetadata[tokenId] = AgentMetadata({
            persona: persona,
            experience: experience,
            voiceHash: "",
            animationURI: "",
            vaultURI: "",
            vaultHash: bytes32(0)
        });
        
        emit AgentMinted(tokenId, to, persona);
        
        return tokenId;
    }

    // ============ BAP-578 核心函数 ============

    /**
     * @dev 执行代理动作
     */
    function executeAction(uint256 tokenId, bytes calldata data) 
        external 
        override 
        onlyAgentOwner(tokenId) 
        whenNotPaused(tokenId) 
        nonReentrant 
    {
        State storage state = _agentStates[tokenId];
        
        if (state.logicAddress != address(0)) {
            // 调用逻辑合约
            (bool success, bytes memory result) = state.logicAddress.delegatecall{gas: MAX_GAS_FOR_DELEGATECALL}(data);
            require(success, "Action execution failed");
            emit ActionExecuted(msg.sender, result);
        }
        
        state.lastActionTimestamp = block.timestamp;
    }

    /**
     * @dev 设置逻辑合约地址
     */
    function setLogicAddress(uint256 tokenId, address newLogic) 
        external 
        override 
        onlyAgentOwner(tokenId) 
    {
        address oldLogic = _agentStates[tokenId].logicAddress;
        _agentStates[tokenId].logicAddress = newLogic;
        emit LogicUpgraded(msg.sender, oldLogic, newLogic);
    }

    /**
     * @dev 为代理充值
     */
    function fundAgent(uint256 tokenId) 
        external 
        payable 
        override 
        agentExists(tokenId) 
    {
        _agentStates[tokenId].balance += msg.value;
        emit AgentFunded(msg.sender, msg.sender, msg.value);
    }

    /**
     * @dev 获取代理状态
     */
    function getState(uint256 tokenId) 
        external 
        view 
        override 
        agentExists(tokenId) 
        returns (State memory) 
    {
        return _agentStates[tokenId];
    }

    /**
     * @dev 获取代理元数据
     */
    function getAgentMetadata(uint256 tokenId) 
        external 
        view 
        override 
        agentExists(tokenId) 
        returns (AgentMetadata memory) 
    {
        return _agentMetadata[tokenId];
    }

    /**
     * @dev 更新代理元数据
     */
    function updateAgentMetadata(uint256 tokenId, AgentMetadata memory metadata) 
        external 
        override 
        onlyAgentOwner(tokenId) 
    {
        _agentMetadata[tokenId] = metadata;
        emit MetadataUpdated(tokenId, metadata.vaultURI);
    }

    // ============ 生命周期管理 ============

    function pause(uint256 tokenId) external override onlyAgentOwner(tokenId) {
        _agentStates[tokenId].status = Status.Paused;
        emit StatusChanged(msg.sender, Status.Paused);
    }

    function unpause(uint256 tokenId) external override onlyAgentOwner(tokenId) {
        require(_agentStates[tokenId].status == Status.Paused, "Not paused");
        _agentStates[tokenId].status = Status.Active;
        emit StatusChanged(msg.sender, Status.Active);
    }

    function terminate(uint256 tokenId) external override onlyAgentOwner(tokenId) {
        State storage state = _agentStates[tokenId];
        
        // 返还余额
        if (state.balance > 0) {
            uint256 balance = state.balance;
            state.balance = 0;
            payable(msg.sender).transfer(balance);
        }
        
        state.status = Status.Terminated;
        emit StatusChanged(msg.sender, Status.Terminated);
    }

    // ============ 预测相关函数 ============

    /**
     * @dev 记录预测 (链上存证)
     * @param tokenId 代理 ID
     * @param gameId 比赛 ID (bytes32 哈希)
     * @param homeWinProb 主队获胜概率 (1e18 精度，如 0.65 = 650000000000000000)
     * @param rationale 预测理由哈希 (IPFS 或其他存储)
     */
    function recordPrediction(
        uint256 tokenId,
        bytes32 gameId,
        uint256 homeWinProb,
        string memory rationale
    ) external onlyAgentOwner(tokenId) whenNotPaused(tokenId) {
        require(homeWinProb <= 1e18, "Probability exceeds 100%");
        
        _agentStates[tokenId].lastActionTimestamp = block.timestamp;
        
        emit PredictionRecorded(tokenId, gameId, homeWinProb);
        
        // 如果有学习模块，记录交互
        if (learningModule != address(0)) {
            ILearningModule(learningModule).recordInteraction(tokenId, "prediction", true);
        }
    }

    // ============ 管理函数 ============

    function setLearningModule(address _learningModule) external onlyOwner {
        learningModule = _learningModule;
    }

    function setGlobalPaused(bool _paused) external onlyOwner {
        globalPaused = _paused;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ============ 查询函数 ============

    function totalAgents() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function getAgentsByOwner(address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _nextTokenId && index < balance; i++) {
            if (_ownerOf(i) == _owner) {
                tokens[index++] = i;
            }
        }
        
        return tokens;
    }

    // ============ Override 函数 ============

    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    // 接收 BNB
    receive() external payable {}
}
