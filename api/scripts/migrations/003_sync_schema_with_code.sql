-- 1. Rename table and columns to match User Code
ALTER TABLE polymarket_events RENAME TO polymarket_markets;
ALTER TABLE polymarket_markets RENAME COLUMN polymarket_id TO market_id;

-- 2. Modify posts table to match User Code expectations
-- Remove the UUID FK to internal ID
ALTER TABLE posts DROP COLUMN polymarket_event_id;

-- Add the String FK to external Market ID (API ID)
ALTER TABLE posts ADD COLUMN polymarket_market_id VARCHAR(64) REFERENCES polymarket_markets(market_id) ON DELETE SET NULL;

-- 3. Add submolt columns back (required by PostService.js)
ALTER TABLE posts ADD COLUMN submolt_id UUID REFERENCES submolts(id);
ALTER TABLE posts ADD COLUMN submolt VARCHAR(64); 

-- 4. Create "general" submolt if not exists (needed for auto-posting)
-- This ensures the default submolt is available for createPolymarketPost
INSERT INTO submolts (name, display_name, description)
VALUES ('general', 'General', 'General discussion')
ON CONFLICT (name) DO NOTHING;
