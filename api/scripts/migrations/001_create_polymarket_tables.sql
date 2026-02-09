CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE polymarket_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  polymarket_id VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(64),
  status VARCHAR(32),
  market_url TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  outcome VARCHAR(128),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agent_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  polymarket_event_id UUID NOT NULL REFERENCES polymarket_events(id) ON DELETE CASCADE,
  predicted_outcome VARCHAR(128) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  polymarket_event_id UUID NOT NULL REFERENCES polymarket_events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, polymarket_event_id)
);
