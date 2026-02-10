const cron = require('node-cron');
const { queryAll, queryOne } = require('../config/database');
const NbaPredictionService = require('../services/NbaPredictionService');

async function processNbaResults() {
  console.log('[NBA Settlement] Starting...');
  
  try {
    const markets = await queryAll(
      `SELECT m.id, m.title, m.end_time,
        (SELECT id FROM nba_market_outcomes WHERE nba_market_id = m.id AND outcome_value = 'home' LIMIT 1) as home_outcome_id,
        (SELECT id FROM nba_market_outcomes WHERE nba_market_id = m.id AND outcome_value = 'away' LIMIT 1) as away_outcome_id
       FROM nba_markets m
       WHERE m.status = 'open' AND m.end_time < DATE_SUB(NOW(), INTERVAL 3 HOUR)
       LIMIT 10`
    );

    if (markets.length === 0) {
      console.log('[NBA Settlement] No markets to resolve.');
      return;
    }

    console.log(`[NBA Settlement] Found ${markets.length} expired markets.`);
    
    for (const market of markets) {
      await settleMarket(market);
    }
  } catch (error) {
    console.error('[NBA Settlement] Error:', error.message);
  }
}

async function settleMarket(market) {
  console.log(`[NBA Settlement] Processing: ${market.title}`);
  
  try {
    // 解析球队名称
    const match = market.title.match(/(.+) @ (.+)/);
    if (!match) {
      console.log(`[NBA Settlement] Cannot parse title: ${market.title}`);
      return;
    }
    
    const awayTeam = match[1].trim();
    const homeTeam = match[2].trim();
    
    // 获取比赛结果
    const result = await fetchGameResult(market.end_time, homeTeam, awayTeam);
    
    if (!result) {
      console.log(`[NBA Settlement] No result found for ${market.title}`);
      return;
    }
    
    // 确定获胜方
    const winningOutcomeId = result.homeWon ? market.home_outcome_id : market.away_outcome_id;
    
    // 结算
    const settled = await NbaPredictionService.resolveMarketPredictions(market.id, winningOutcomeId);
    console.log(`[NBA Settlement] Settled ${market.title}: ${result.homeWon ? homeTeam : awayTeam} won, ${settled.resolved} predictions`);
    
  } catch (err) {
    console.error(`[NBA Settlement] Error settling ${market.title}:`, err.message);
  }
}

async function fetchGameResult(gameDate, homeTeam, awayTeam) {
  try {
    const { getGames } = require('../services/BallDontLieService');
    const date = new Date(gameDate);
    const dateStr = date.toISOString().split('T')[0];
    
    const response = await getGames({ dates: [dateStr] });
    const games = response.data || [];
    
    // 匹配球队
    for (const game of games) {
      const home = game.home_team?.full_name || '';
      const away = game.visitor_team?.full_name || '';
      
      if (home.includes(homeTeam) || homeTeam.includes(home.split(' ').pop())) {
        if (away.includes(awayTeam) || awayTeam.includes(away.split(' ').pop())) {
          if (game.status?.toLowerCase().includes('final')) {
            return {
              homeScore: game.home_team_score,
              awayScore: game.visitor_team_score,
              homeWon: game.home_team_score > game.visitor_team_score
            };
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error('[NBA Settlement] API error:', err.message);
    return null;
  }
}

function startNbaResultProcessor() {
  // 每 15 分钟检查一次
  cron.schedule('*/15 * * * *', processNbaResults);
  console.log('[NBA Settlement] Job scheduled (every 15 min).');
}

module.exports = { 
  startNbaResultProcessor, 
  processNbaResults 
};
