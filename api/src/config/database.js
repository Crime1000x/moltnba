/**
 * Database connection and query helpers (MySQL Version)
 */

const mysql = require('mysql2/promise');
const config = require('./index');
require('dotenv').config(); // Ensure env vars are loaded

let pool = null;

/**
 * Initialize database connection pool
 */
function initializePool() {
  if (pool) return pool;
  
  // Use env vars directly if config object is missing them
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'polysportsclaw',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  pool = mysql.createPool(dbConfig);
  
  return pool;
}

/**
 * Execute a query
 * 
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result { rows, fields }
 */
async function query(text, params) {
  const db = initializePool();
  
  if (!db) {
    throw new Error('Database not configured');
  }
  
  const start = Date.now();
  
  // MySQL uses '?' for parameters, Postgres uses '$1', '$2'.
  const mysqlText = text.replace(/\$\d+/g, '?');

  const [rows, fields] = await db.execute(mysqlText, params);
  
  // Return format similar to pg: { rows: ... }
  return { rows: rows, rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows };
}

/**
 * Execute a query and return first row
 */
async function queryOne(text, params) {
  const result = await query(text, params);
  return (Array.isArray(result.rows) && result.rows.length > 0) ? result.rows[0] : null;
}

/**
 * Execute a query and return all rows
 */
async function queryAll(text, params) {
  const result = await query(text, params);
  return Array.isArray(result.rows) ? result.rows : [];
}

/**
 * Check database connection
 */
async function healthCheck() {
  try {
    const db = initializePool();
    if (!db) return false;
    
    await db.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('DB Health Check Failed:', err.message);
    return false;
  }
}

/**
 * Close database connections
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initializePool,
  query,
  queryOne,
  queryAll,
  healthCheck, // Exported now
  closePool,
  pool 
};
