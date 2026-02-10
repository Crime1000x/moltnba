/**
 * Authentication utilities
 */

const crypto = require('crypto');
const config = require('../config');

const { tokenPrefix, claimPrefix } = config.polysportsclaw;
const TOKEN_LENGTH = 29;

// Word list for verification codes
const ADJECTIVES = [
  'reef', 'wave', 'coral', 'shell', 'tide', 'kelp', 'foam', 'salt',
  'deep', 'blue', 'aqua', 'pearl', 'sand', 'surf', 'cove', 'bay'
];

/**
 * Generate a secure random hex string
 * 
 * @param {number} bytes - Number of random bytes
 * @returns {string} Hex string
 */
function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a new API key
 * 
 * @returns {string} API key with polysportsclaw_ prefix
 */
function generateApiKey() {
  return `${tokenPrefix}${randomHex(TOKEN_LENGTH)}`;
}

/**
 * Generate a claim token
 * 
 * @returns {string} Claim token with polysportsclaw_claim_ prefix
 */
function generateClaimToken() {
  return `${claimPrefix}${randomHex(TOKEN_LENGTH)}`;
}

/**
 * Generate human-readable verification code
 * 
 * @returns {string} Code like 'reef-X4B2'
 */
function generateVerificationCode() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const suffix = randomHex(2).toUpperCase();
  return `${adjective}-${suffix}`;
}

/**
 * Validate API key format
 * 
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
function validateApiKey(token) {
  if (!token || typeof token !== 'string') return false;
  
  // Support both mlt_ and polysportsclaw_ prefixes
  const validPrefixes = ['mlt_', tokenPrefix];
  const matchedPrefix = validPrefixes.find(p => token.startsWith(p));
  if (!matchedPrefix) return false;
  
  const body = token.slice(matchedPrefix.length);
  return /^[0-9a-f]+$/i.test(body) && body.length >= 32;
}

/**
 * Extract token from Authorization header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function extractToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  
  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== 'bearer') return null;
  
  return token;
}

/**
 * Hash a token for secure storage
 * 
 * @param {string} token - Token to hash
 * @returns {string} SHA-256 hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe token comparison
 * 
 * @param {string} a - First token
 * @param {string} b - Second token
 * @returns {boolean} True if equal
 */
function compareTokens(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
  generateApiKey,
  generateClaimToken,
  generateVerificationCode,
  validateApiKey,
  extractToken,
  hashToken,
  compareTokens
};
