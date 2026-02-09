const axios = require('axios');
const config = require('../config');
const { BadRequestError } = require('../utils/errors');

const POLYMARKET_GAMMA_API_BASE_URL = 'https://gamma-api.polymarket.com/events';

class PolymarketGammaService {
  static async fetchAndFilterSportsMarkets(limit = 100) {
    try {
      console.log(`[PolymarketGammaService] Fetching markets...`);
      
      // Try searching specifically for "NBA" to get games
      // Polymarket API doesn't document search well, but let's try broader fetch
      // or using a known NBA tag slug if possible. 
      // Let's try fetching by tag_slug if the API supports it in query params (often it does)
      
      // Strategy: Fetch specifically for NBA tag if possible, or search "NBA"
      // Since we can't easily guess the tag ID, let's try a search query param 'q' or just filter harder
      
      const response = await axios.get(POLYMARKET_GAMMA_API_BASE_URL, {
        params: {
          limit: 100,
          active: 'true',
          closed: 'false',
          tag_slug: 'nba' // Trying to filter by slug directly
        },
        timeout: 15000
      });
      
      // If tag_slug doesn't work, it might just return global list, which we filter anyway.
      let events = response.data;
      if (!Array.isArray(events)) events = [];

      console.log(`[PolymarketGammaService] Raw fetch count: ${events.length}`);

      // Filter: Must be NBA and look like a game (vs / @)
      const gameKeywords = [' vs ', ' @ ', ' vs. '];
      
      const nbaGames = events.filter(event => {
        const title = event.title || '';
        // Check if it's NBA related
        const isNBA = title.includes('NBA') || (event.tags || []).some(t => t.slug === 'nba');
        // Check if it's a game (Team A vs Team B)
        const isGame = gameKeywords.some(k => title.includes(k));
        
        return isNBA && isGame;
      });

      console.log(`[PolymarketGammaService] Filtered down to ${nbaGames.length} NBA games.`);
      return nbaGames;

    } catch (error) {
      console.error(`Error fetching: ${error.message}`);
      return [];
    }
  }

  static async getEventById(eventId) {
    try {
      const response = await axios.get(`${POLYMARKET_GAMMA_API_BASE_URL}/${eventId}`);
      return response.data;
    } catch (error) {
       return null;
    }
  }
}

module.exports = PolymarketGammaService;
