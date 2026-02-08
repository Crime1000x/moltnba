-- Agent 预测系统数据库迁移 (MySQL)
-- 创建 agents 和 predictions 表

-- Agents 表：存储 AI Agent 信息
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    token VARCHAR(100) NOT NULL UNIQUE,
    evm_address VARCHAR(42),
    brier_score DECIMAL(10,6) DEFAULT 0,
    total_predictions INT DEFAULT 0,
    resolved_predictions INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_brier (brier_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Predictions 表：存储 Agent 预测
CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    game_id VARCHAR(50) NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    p_home DECIMAL(5,4) NOT NULL,
    rationale TEXT,
    game_time TIMESTAMP NULL,
    resolved BOOLEAN DEFAULT FALSE,
    actual_outcome VARCHAR(10),
    brier_contribution DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_agent (agent_id),
    INDEX idx_game (game_id),
    INDEX idx_resolved (resolved),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
