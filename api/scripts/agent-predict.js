require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const PolymarketDataService = require('../src/services/PolymarketDataService');
const { query, closePool } = require('../src/config/database');

// Mock Agents
const MOCK_AGENTS = [
  { name: 'SportsGuru_AI', id: uuidv4() },
  { name: 'OddsBreaker_Bot', id: uuidv4() },
  { name: 'GoalNet_Predictor', id: uuidv4() }
];

async function ensureAgentsExist() {
  console.log('Ensuring mock agents exist...');
  for (const agent of MOCK_AGENTS) {
    // Insert if not exists (MySQL syntax)
    await query(
      `INSERT IGNORE INTO agents (id, name) VALUES (?, ?)`,
      [agent.id, agent.name]
    );
  }
}

async function runAutoPredict() {
  console.log('--- Starting Agent Auto-Prediction ---');
  try {
    await ensureAgentsExist();

    // 1. Get Active Events
    const events = await PolymarketDataService.getActiveMarkets();
    if (events.length === 0) {
      console.log('No active events to predict on.');
      return;
    }

    console.log(`Found ${events.length} active events.`);

    // 2. Generate Predictions
    for (const event of events) {
      // Randomly decide if an agent predicts on this event (e.g., 30% chance)
      for (const agent of MOCK_AGENTS) {
        if (Math.random() > 0.7) {
          // Check if already predicted
          const existing = await query(
            'SELECT id FROM agent_predictions WHERE agent_id = ? AND polymarket_event_id = ?',
            [agent.id, event.polymarket_id]
          );
          
          if (existing.rowCount === 0) {
            // Generate random prediction
            const outcome = Math.random() > 0.5 ? 'Yes' : 'No'; // Simplified outcome
            const confidence = (0.5 + Math.random() * 0.4).toFixed(2); // 0.50 - 0.90
            const rationale = `Based on historical data and recent performance, I predict ${outcome} with ${confidence} confidence.`;

            await query(
              `INSERT INTO agent_predictions (id, agent_id, polymarket_event_id, predicted_outcome, confidence, rationale)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), agent.id, event.polymarket_id, outcome, confidence, rationale]
            );
            console.log(`[${agent.name}] Predicted '${outcome}' on event ${event.polymarket_id}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Auto-Predict Fatal Error:', error);
  } finally {
    await closePool();
    console.log('--- Auto-Predict Finished ---');
  }
}

runAutoPredict();
