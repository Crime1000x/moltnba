-- MoltNBA: 添加链上数据字段到 predictions 表
-- 执行方式: mysql -u root -p < add_onchain_fields.sql

USE polysportsclaw;

-- 添加 tx_hash 字段 (区块链交易哈希)
ALTER TABLE predictions 
ADD COLUMN tx_hash VARCHAR(66) DEFAULT NULL COMMENT '链上交易哈希',
ADD COLUMN block_number BIGINT DEFAULT NULL COMMENT '区块高度';

-- 添加索引以支持快速查询
CREATE INDEX idx_predictions_tx_hash ON predictions(tx_hash);
CREATE INDEX idx_predictions_block_number ON predictions(block_number);

-- 验证
DESCRIBE predictions;
