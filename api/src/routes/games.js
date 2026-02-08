const express = require('express');
const NBAGameService = require('../services/NBAGameService');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

/**
 * @route GET /api/games
 * @desc Get all NBA games (upcoming + recent)
 * @access Public
 */
router.get('/', async (req, res, next) => {
  try {
    const games = await NBAGameService.getAllGames(50);
    res.json(games);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/games/today
 * @desc Get today's NBA games
 * @access Public
 */
router.get('/today', async (req, res, next) => {
  try {
    const games = await NBAGameService.getTodayGames();
    res.json(games);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/games/upcoming
 * @desc Get upcoming scheduled games
 * @access Public
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const games = await NBAGameService.getUpcomingGames();
    res.json(games);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/games/:id
 * @desc Get a single game by ID
 * @access Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await NBAGameService.getGameById(id);

    if (!game) {
      throw new NotFoundError(`Game with ID ${id} not found.`);
    }
    res.json(game);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
