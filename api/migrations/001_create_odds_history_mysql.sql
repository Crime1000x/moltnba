-- 赔率历史表 (MySQL Version)
-- 用于存储定期采集的 Polymarket 赔率数据

CREATE TABLE IF NOT EXISTS odds_history (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
    game_id VARCHAR(50) NOT NULL COMMENT 'BallDontLie game ID',
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    home_probability DECIMAL(5,4) COMMENT '0.0000 - 1.0000',
    away_probability DECIMAL(5,4),
    polymarket_token_id VARCHAR(100) COMMENT 'Polymarket token ID (optional)',
    volume DECIMAL(20,2) DEFAULT 0 COMMENT 'Volume',
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Collection timestamp',
    
    -- 索引
    INDEX idx_odds_history_game_time (game_id, collected_at DESC),
    INDEX idx_odds_history_collected_at (collected_at),
    
    -- 唯一约束
    UNIQUE KEY idx_odds_history_unique (game_id, collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Odds history records';
