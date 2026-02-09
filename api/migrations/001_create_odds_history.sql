-- 赔率历史表 (MySQL 版本)
-- 用于存储定期采集的 Polymarket 赔率数据

CREATE TABLE IF NOT EXISTS odds_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,           -- BallDontLie game ID
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    home_probability DECIMAL(5,4),          -- 0.0000 - 1.0000
    away_probability DECIMAL(5,4),
    polymarket_token_id VARCHAR(100),       -- Polymarket token ID (可选)
    volume DECIMAL(20,2) DEFAULT 0,         -- 交易量
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_game_time (game_id, collected_at),
    INDEX idx_collected_at (collected_at),
    UNIQUE KEY unique_game_collect (game_id, collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
