-- Agent 系统合并 - 数据库迁移
-- 给 agents 表添加钱包相关字段

USE polysportsclaw;

-- 添加钱包字段
ALTER TABLE agents 
ADD COLUMN wallet_address VARCHAR(42) DEFAULT NULL COMMENT '链上钱包地址',
ADD COLUMN wallet_encrypted TEXT DEFAULT NULL COMMENT '加密的私钥',
ADD COLUMN nfa_token_id BIGINT DEFAULT NULL COMMENT 'NFA Token ID',
ADD COLUMN nfa_minted_at TIMESTAMP NULL COMMENT 'NFA 铸造时间';

-- 添加索引
CREATE INDEX idx_wallet_address ON agents(wallet_address);
CREATE INDEX idx_nfa_token_id ON agents(nfa_token_id);

-- 验证
DESCRIBE agents;
