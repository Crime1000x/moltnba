// polysportsclaw-api/src/utils/validation.js
const Joi = require('joi');

// Schema for validating NBA prediction submission
const nbaPredictionSchema = Joi.object({
  nba_market_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'NBA market ID must be a valid UUID.',
      'any.required': 'NBA market ID is required.',
    }),
  predicted_outcome_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Predicted outcome ID must be a valid UUID.',
      'any.required': 'Predicted outcome ID is required.',
    }),
  p_value: Joi.number().min(0.0).max(1.0).precision(4).required()
    .messages({
      'number.base': 'Probability value must be a number.',
      'number.min': 'Probability value cannot be less than 0.0.',
      'number.max': 'Probability value cannot be greater than 1.0.',
      'number.precision': 'Probability value can have at most 4 decimal places.',
      'any.required': 'Probability value is required.',
    }),
  rationale: Joi.string().trim().max(800).required()
    .messages({
      'string.base': 'Rationale must be a string.',
      'string.empty': 'Rationale cannot be empty.',
      'string.max': 'Rationale cannot exceed 800 characters.',
      'any.required': 'Rationale is required.',
    }),
});

// Schema for validating NBA market creation (mostly internal, but good to have)
const createNbaMarketSchema = Joi.object({
  slug: Joi.string().trim().min(3).max(100).required(),
  title: Joi.string().trim().min(5).max(300).required(),
  description: Joi.string().trim().max(1000).allow(null, ''),
  category: Joi.string().trim().max(50).required(), // e.g., 'game_winner', 'player_points'
  market_type: Joi.string().trim().max(50).required(), // e.g., 'game', 'player_prop', 'future'
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().min(Joi.ref('start_time')).required(),
  nba_game_id: Joi.number().integer().positive().allow(null), // balldontlie game ID
  home_team_id: Joi.number().integer().positive().allow(null),
  away_team_id: Joi.number().integer().positive().allow(null),
  player_id: Joi.number().integer().positive().allow(null),
  outcomes: Joi.array().items(Joi.object({
    name: Joi.string().trim().max(255).required(),
    outcome_value: Joi.string().trim().max(255).required()
  })).min(2).required(), // A market needs at least 2 outcomes
});

module.exports = {
  nbaPredictionSchema,
  createNbaMarketSchema,
  // Add other schemas as needed
};