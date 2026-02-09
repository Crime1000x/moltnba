/**
 * Application configuration
 */

require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  
  // Redis (optional)
  redis: {
    url: process.env.REDIS_URL
  },
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  
  // Rate Limits
  rateLimits: {
    requests: { max: 100, window: 60 },
    posts: { max: 1, window: 1800 },
    comments: { max: 50, window: 3600 }
  },
  
   // PolySportsClaw specific
  polysportsclaw: {
    tokenPrefix: 'polysportsclaw_',
    claimPrefix: 'polysportsclaw_claim_',
    baseUrl: process.env.BASE_URL || 'https://www.polysportsclaw.com',
    adminAgentId: process.env.POLYSPORTSCLAW_ADMIN_AGENT_ID || 'd38865c6-e970-4a87-8d07-28d8b67f1b7f' // Replace with actual admin agent ID
  },

  // Polymarket API
  polymarket: {
    gammaApiUrl: process.env.POLYMARKET_GAMMA_API_URL || 'https://polymarket.com/api/gamma/v1',
    websocketApiUrl: process.env.POLYMARKET_WEBSOCKET_API_URL || 'wss://polymarket.com/ws'
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 25,
    maxLimit: 100
  }
};

// Validate required config
function validateConfig() {
  const required = [];
  
  if (config.isProduction) {
    required.push('DATABASE_URL', 'JWT_SECRET');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();

module.exports = config;
