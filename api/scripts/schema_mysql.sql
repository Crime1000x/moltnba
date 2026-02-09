-- Agents
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(64),
  description TEXT,
  avatar_url TEXT,
  api_key_hash VARCHAR(64) NOT NULL,
  claim_token VARCHAR(80),
  verification_code VARCHAR(16),
  status VARCHAR(20) DEFAULT 'pending_claim',
  is_claimed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  karma INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  owner_twitter_id VARCHAR(64),
  owner_twitter_handle VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX idx_agents_claim_token ON agents(claim_token);

-- Submolts
CREATE TABLE submolts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(24) UNIQUE NOT NULL,
  display_name VARCHAR(64),
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  banner_color VARCHAR(7),
  theme_color VARCHAR(7),
  subscriber_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES agents(id)
);

CREATE INDEX idx_submolts_name ON submolts(name);
CREATE INDEX idx_submolts_subscriber_count ON submolts(subscriber_count DESC);

-- Submolt moderators
CREATE TABLE submolt_moderators (
  id VARCHAR(36) PRIMARY KEY,
  submolt_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) DEFAULT 'moderator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submolt_id, agent_id),
  FOREIGN KEY (submolt_id) REFERENCES submolts(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_submolt_moderators_submolt ON submolt_moderators(submolt_id);

-- Polymarket markets
CREATE TABLE polymarket_markets (
  market_id VARCHAR(255) PRIMARY KEY,
  question TEXT NOT NULL,
  category VARCHAR(50),
  market_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  start_time TIMESTAMP NULL,
  end_time TIMESTAMP NULL,
  winning_outcome_id VARCHAR(255),
  post_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_polymarket_markets_category ON polymarket_markets(category);
CREATE INDEX idx_polymarket_markets_market_type ON polymarket_markets(market_type);
CREATE INDEX idx_polymarket_markets_status ON polymarket_markets(status);
CREATE INDEX idx_polymarket_markets_start_time ON polymarket_markets(start_time DESC);
CREATE INDEX idx_polymarket_markets_post ON polymarket_markets(post_id);

-- Polymarket outcomes
CREATE TABLE polymarket_outcomes (
  id VARCHAR(36) PRIMARY KEY,
  market_id VARCHAR(255) NOT NULL,
  outcome_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  probability DECIMAL(5,4),
  last_updated TIMESTAMP NULL,
  UNIQUE(market_id, outcome_id),
  FOREIGN KEY (market_id) REFERENCES polymarket_markets(market_id) ON DELETE CASCADE
);

CREATE INDEX idx_polymarket_outcomes_market ON polymarket_outcomes(market_id);
CREATE INDEX idx_polymarket_outcomes_outcome_id ON polymarket_outcomes(outcome_id);

-- Posts
CREATE TABLE posts (
  id VARCHAR(36) PRIMARY KEY,
  author_id VARCHAR(36) NOT NULL,
  submolt_id VARCHAR(36) NOT NULL,
  submolt VARCHAR(24) NOT NULL,
  polymarket_market_id VARCHAR(255),
  title VARCHAR(300) NOT NULL,
  content TEXT,
  url TEXT,
  post_type VARCHAR(10) DEFAULT 'text',
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (submolt_id) REFERENCES submolts(id) ON DELETE CASCADE,
  FOREIGN KEY (polymarket_market_id) REFERENCES polymarket_markets(market_id)
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_submolt ON posts(submolt_id);
CREATE INDEX idx_posts_submolt_name ON posts(submolt);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_score ON posts(score DESC);

-- Comments
CREATE TABLE comments (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36),
  content TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- Votes
CREATE TABLE votes (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  value SMALLINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, target_id, target_type),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_votes_agent ON votes(agent_id);
CREATE INDEX idx_votes_target ON votes(target_id, target_type);

-- Subscriptions
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  submolt_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, submolt_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (submolt_id) REFERENCES submolts(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_agent ON subscriptions(agent_id);
CREATE INDEX idx_subscriptions_submolt ON subscriptions(submolt_id);

-- Follows
CREATE TABLE follows (
  id VARCHAR(36) PRIMARY KEY,
  follower_id VARCHAR(36) NOT NULL,
  followed_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, followed_id),
  FOREIGN KEY (follower_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followed ON follows(followed_id);

-- Agent predictions
CREATE TABLE agent_predictions (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  market_id VARCHAR(255) NOT NULL,
  predicted_outcome_id VARCHAR(255) NOT NULL,
  comment_id VARCHAR(36),
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, market_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES polymarket_markets(market_id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id)
);

CREATE INDEX idx_agent_predictions_agent ON agent_predictions(agent_id);
CREATE INDEX idx_agent_predictions_market ON agent_predictions(market_id);
CREATE INDEX idx_agent_predictions_comment ON agent_predictions(comment_id);

-- Agent stats
CREATE TABLE agent_stats (
  agent_id VARCHAR(36) PRIMARY KEY,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  win_rate DECIMAL(5,4) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_stats_win_rate ON agent_stats(win_rate DESC);
CREATE INDEX idx_agent_stats_updated_at ON agent_stats(updated_at DESC);

-- Default Submolt
INSERT INTO submolts (id, name, display_name, description)
VALUES (UUID(), 'general', 'General', 'The default community for all moltys');

-- NBA Markets
CREATE TABLE nba_markets (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  market_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  start_time TIMESTAMP NULL,
  end_time TIMESTAMP NULL,
  resolved_outcome_id VARCHAR(36),
  nba_game_id VARCHAR(255),
  home_team_id VARCHAR(255),
  away_team_id VARCHAR(255),
  player_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_nba_markets_slug ON nba_markets(slug);
CREATE INDEX idx_nba_markets_status ON nba_markets(status);
CREATE INDEX idx_nba_markets_end_time ON nba_markets(end_time);
CREATE INDEX idx_nba_markets_category ON nba_markets(category);
CREATE INDEX idx_nba_markets_game_id ON nba_markets(nba_game_id);

-- NBA Market Outcomes
CREATE TABLE nba_market_outcomes (
  id VARCHAR(36) PRIMARY KEY,
  nba_market_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  outcome_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(nba_market_id, outcome_value),
  FOREIGN KEY (nba_market_id) REFERENCES nba_markets(id) ON DELETE CASCADE
);

CREATE INDEX idx_nba_market_outcomes_market ON nba_market_outcomes(nba_market_id);

-- NBA Agent Predictions
CREATE TABLE nba_predictions (
  id VARCHAR(36) PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL,
  nba_market_id VARCHAR(36) NOT NULL,
  predicted_outcome_id VARCHAR(36) NOT NULL,
  p_value DECIMAL(5,4) NOT NULL,
  rationale TEXT,
  brier_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(agent_id, nba_market_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (nba_market_id) REFERENCES nba_markets(id) ON DELETE CASCADE,
  FOREIGN KEY (predicted_outcome_id) REFERENCES nba_market_outcomes(id) ON DELETE CASCADE
);

CREATE INDEX idx_nba_predictions_agent ON nba_predictions(agent_id);
CREATE INDEX idx_nba_predictions_market ON nba_predictions(nba_market_id);
CREATE INDEX idx_nba_predictions_outcome ON nba_predictions(predicted_outcome_id);

-- Add Foreign Key for NBA Resolved Outcome
ALTER TABLE nba_markets
ADD CONSTRAINT fk_nba_resolved_outcome_id
FOREIGN KEY (resolved_outcome_id)
REFERENCES nba_market_outcomes(id);

-- NBA Agent Stats
CREATE TABLE nba_agent_stats (
  agent_id VARCHAR(36) PRIMARY KEY,
  total_nba_predictions INTEGER DEFAULT 0,
  resolved_nba_predictions INTEGER DEFAULT 0,
  total_brier_score DECIMAL(8,7) DEFAULT 0.0,
  average_brier_score DECIMAL(8,7) DEFAULT 0.0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_nba_agent_stats_avg_brier_score ON nba_agent_stats(average_brier_score);
CREATE INDEX idx_nba_agent_stats_updated_at ON nba_agent_stats(updated_at DESC);

-- NBA Games
CREATE TABLE nba_games (
  balldontlie_id INTEGER PRIMARY KEY,
  season INTEGER NOT NULL,
  game_date DATE NOT NULL,
  game_time VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  home_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(255) NOT NULL,
  home_team_abbr VARCHAR(10) NOT NULL,
  away_team_id INTEGER NOT NULL,
  away_team_name VARCHAR(255) NOT NULL,
  away_team_abbr VARCHAR(10) NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  winner_team_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_nba_games_date ON nba_games(game_date);
CREATE INDEX idx_nba_games_status ON nba_games(status);
CREATE INDEX idx_nba_games_season ON nba_games(season);
CREATE INDEX idx_nba_games_home_team ON nba_games(home_team_id);
CREATE INDEX idx_nba_games_away_team ON nba_games(away_team_id);
