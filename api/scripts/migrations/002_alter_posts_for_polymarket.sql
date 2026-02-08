ALTER TABLE posts
  DROP COLUMN submolt_id,
  DROP COLUMN submolt,
  ADD COLUMN polymarket_event_id UUID NOT NULL;

ALTER TABLE posts
ADD CONSTRAINT fk_polymarket_event
FOREIGN KEY (polymarket_event_id)
REFERENCES polymarket_events(id) ON DELETE CASCADE;
