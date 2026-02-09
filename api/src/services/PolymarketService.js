// polysportsclaw-api/src/services/PolymarketService.js

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';

// NBA 球队代码映射 (Polymarket 使用的缩写)
const NBA_TEAM_CODES = {
  'Atlanta Hawks': 'atl',
  'Boston Celtics': 'bos',
  'Brooklyn Nets': 'bkn',
  'Charlotte Hornets': 'cha',
  'Chicago Bulls': 'chi',
  'Cleveland Cavaliers': 'cle',
  'Dallas Mavericks': 'dal',
  'Denver Nuggets': 'den',
  'Detroit Pistons': 'det',
  'Golden State Warriors': 'gsw',
  'Houston Rockets': 'hou',
  'Indiana Pacers': 'ind',
  'LA Clippers': 'lac',
  'Los Angeles Lakers': 'lal',
  'Memphis Grizzlies': 'mem',
  'Miami Heat': 'mia',
  'Milwaukee Bucks': 'mil',
  'Minnesota Timberwolves': 'min',
  'New Orleans Pelicans': 'nop',
  'New York Knicks': 'nyk',
  'Oklahoma City Thunder': 'okc',
  'Orlando Magic': 'orl',
  'Philadelphia 76ers': 'phi',
  'Phoenix Suns': 'phx',
  'Portland Trail Blazers': 'por',
  'Sacramento Kings': 'sac',
  'San Antonio Spurs': 'sas',
  'Toronto Raptors': 'tor',
  'Utah Jazz': 'uta',
  'Washington Wizards': 'was',
};

// 短名称到全名的映射
const SHORT_TO_FULL_NAME = {
  'hawks': 'Atlanta Hawks',
  'celtics': 'Boston Celtics',
  'nets': 'Brooklyn Nets',
  'hornets': 'Charlotte Hornets',
  'bulls': 'Chicago Bulls',
  'cavaliers': 'Cleveland Cavaliers',
  'cavs': 'Cleveland Cavaliers',
  'mavericks': 'Dallas Mavericks',
  'mavs': 'Dallas Mavericks',
  'nuggets': 'Denver Nuggets',
  'pistons': 'Detroit Pistons',
  'warriors': 'Golden State Warriors',
  'rockets': 'Houston Rockets',
  'pacers': 'Indiana Pacers',
  'clippers': 'LA Clippers',
  'lakers': 'Los Angeles Lakers',
  'grizzlies': 'Memphis Grizzlies',
  'heat': 'Miami Heat',
  'bucks': 'Milwaukee Bucks',
  'timberwolves': 'Minnesota Timberwolves',
  'wolves': 'Minnesota Timberwolves',
  'pelicans': 'New Orleans Pelicans',
  'knicks': 'New York Knicks',
  'thunder': 'Oklahoma City Thunder',
  'magic': 'Orlando Magic',
  '76ers': 'Philadelphia 76ers',
  'sixers': 'Philadelphia 76ers',
  'suns': 'Phoenix Suns',
  'trail blazers': 'Portland Trail Blazers',
  'blazers': 'Portland Trail Blazers',
  'kings': 'Sacramento Kings',
  'spurs': 'San Antonio Spurs',
  'raptors': 'Toronto Raptors',
  'jazz': 'Utah Jazz',
  'wizards': 'Washington Wizards',
};

/**
 * 根据球队名称和日期构造 Polymarket 的 NBA 事件 slug。
 * 格式: nba-{客队代码}-{主队代码}-{日期}
 */
function constructEventSlug(awayTeamFullName, homeTeamFullName, date) {
  const awayCode = NBA_TEAM_CODES[awayTeamFullName];
  const homeCode = NBA_TEAM_CODES[homeTeamFullName];

  if (!awayCode || !homeCode) {
    console.warn(`[PolymarketService] Missing team code for ${awayTeamFullName} or ${homeTeamFullName}`);
    return null;
  }

  return `nba-${awayCode}-${homeCode}-${date}`;
}

/**
 * 根据 slug 从 Polymarket API 查询事件。
 */
async function fetchEventBySlug(slug) {
  try {
    console.log(`[PolymarketService] Fetching event for slug: ${slug}`);
    const response = await fetch(`${POLYMARKET_API_BASE}/events?slug=${slug}`);
    if (!response.ok) {
      console.error(`[PolymarketService] Failed to fetch event: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[PolymarketService] Received ${data.length} events`);
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`[PolymarketService] Error fetching event: ${error.message}`);
    return null;
  }
}

/**
 * 解析 Polymarket 市场结果价格字符串。
 */
function parseOutcomePrices(market) {
  try {
    let prices;
    if (typeof market.outcomePrices === 'string') {
      prices = JSON.parse(market.outcomePrices);
    } else if (Array.isArray(market.outcomePrices)) {
      prices = market.outcomePrices;
    } else {
      return { yes: 0.5, no: 0.5 };
    }

    const yesPrice = parseFloat(prices[0]);
    const noPrice = parseFloat(prices[1]);

    // 验证价格有效性
    if (isNaN(yesPrice) || isNaN(noPrice)) {
      return { yes: 0.5, no: 0.5 };
    }

    return { yes: yesPrice, no: noPrice };
  } catch (error) {
    console.error(`[PolymarketService] Error parsing prices: ${error.message}`);
    return { yes: 0.5, no: 0.5 };
  }
}

/**
 * 获取 NBA 比赛的 Polymarket 赔率。
 */
async function getGameOdds(awayTeamFullName, homeTeamFullName, date) {
  const slug = constructEventSlug(awayTeamFullName, homeTeamFullName, date);
  if (!slug) return null;

  const event = await fetchEventBySlug(slug);
  if (!event) {
    console.log(`[PolymarketService] No event found for slug: ${slug}`);
    return null;
  }

  if (!event.markets || event.markets.length === 0) {
    console.log(`[PolymarketService] Event has no markets`);
    return null;
  }

  console.log(`[PolymarketService] Event found with ${event.markets.length} markets`);
  console.log(`[PolymarketService] Event title: ${event.title}`);

  // 简化市场查找逻辑 - 找包含 "vs" 的主要 moneyline 市场
  const mainMarket = event.markets.find(m => {
    const q = (m.question || '').toLowerCase();
    // 排除 spread, over/under 等衍生市场
    const isMoneyline = (q.includes(' vs ') || q.includes(' vs. ')) &&
      !q.includes('over') && !q.includes('under') &&
      !q.includes('spread') && !q.includes('o/u') &&
      !q.includes(':');  // 排除球员 prop

    if (isMoneyline) {
      console.log(`[PolymarketService] Found potential moneyline market: ${m.question}`);
    }
    return isMoneyline;
  });

  if (!mainMarket) {
    // 如果没找到 vs 格式的，尝试使用第一个市场
    console.log(`[PolymarketService] No moneyline market found, trying first market`);
    if (event.markets.length > 0) {
      const firstMarket = event.markets[0];
      console.log(`[PolymarketService] Using first market: ${firstMarket.question}`);
      return parseMarketOdds(firstMarket, event.title);
    }
    return null;
  }

  return parseMarketOdds(mainMarket, event.title);
}

/**
 * 解析市场赔率
 */
function parseMarketOdds(market, eventTitle) {
  const prices = parseOutcomePrices(market);

  console.log(`[PolymarketService] Parsed prices: yes=${prices.yes}, no=${prices.no}`);

  // 从 event.title 或 market.question 解析球队名称
  // 格式通常是 "Nuggets vs. Pistons" 或 "Away Team vs. Home Team"
  const title = eventTitle || market.question || '';
  const vsMatch = title.match(/(.+?)\s+vs\.?\s+(.+)/i);

  if (vsMatch) {
    const teamA = vsMatch[1].trim();  // 第一个球队 (通常是客队)
    const teamB = vsMatch[2].trim();  // 第二个球队 (通常是主队)
    console.log(`[PolymarketService] Parsed teams: ${teamA} vs ${teamB}`);

    // Polymarket 的 Yes 通常对应第一个球队获胜
    // 所以 Yes = Away Win, No = Home Win
    return {
      awayWin: prices.yes,
      homeWin: prices.no,
      marketId: market.id,
      volume: market.volumeNum || 0,
    };
  }

  // 无法解析时返回原始价格
  return {
    homeWin: prices.no,
    awayWin: prices.yes,
    marketId: market.id,
    volume: market.volumeNum || 0,
  };
}

module.exports = {
  NBA_TEAM_CODES,
  SHORT_TO_FULL_NAME,
  constructEventSlug,
  fetchEventBySlug,
  parseOutcomePrices,
  getGameOdds,
};