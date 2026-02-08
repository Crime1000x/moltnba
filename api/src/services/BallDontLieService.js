// polysportsclaw-api/src/services/BallDontLieService.js

const BALLDONTLIE_API_BASE = 'https://api.balldontlie.io';
const API_KEY = process.env.BALLDONTLIE_API_KEY || ''; // Ensure this is set in your environment variables

// Helper function to fetch data from BallDontLie API
async function fetchFromBalldontlie(
  endpoint,
  params = {}
) {
  const url = new URL(`${BALLDONTLIE_API_BASE}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => { url.searchParams.append(`${key}[]`, String(v)); });
    } else if (value !== undefined && value !== null) { // Only append if value is not undefined or null
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`BDL API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Fetches NBA games for specified dates.
 * @param {object} options - Options for fetching games.
 * @param {string[]} options.dates - An array of dates in 'YYYY-MM-DD' format.
 * @returns {Promise<object>} Response object containing game data and meta information.
 */
async function getGames({ dates }) {
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    throw new Error('Dates array is required for fetching games.');
  }

  const response = await fetchFromBalldontlie('/nba/v1/games', {
    dates: dates
  });
  return response; // Return the full response as it contains meta
}

/**
 * 获取 NBA 球队战绩排名
 * @param {number} season - 赛季年份 (如 2025)
 * @returns {Promise<Array>} 球队战绩数组
 */
async function getStandings(season) {
  // NBA赛季跨年：2025-26赛季在API中用2025表示
  // 如果当前月份在1-9月，说明是上一年开始的赛季
  const now = new Date();
  const currentYear = now.getMonth() < 9 ? now.getFullYear() - 1 : now.getFullYear();
  const targetSeason = season || currentYear;

  const response = await fetchFromBalldontlie('/nba/v1/standings', {
    season: targetSeason
  });
  return response.data || [];
}

/**
 * 获取 NBA 伤病报告
 * @param {number|number[]} teamIds - 球队 ID 或 ID 数组
 * @returns {Promise<Array>} 伤病报告数组
 */
async function getInjuries(teamIds) {
  const params = {};
  if (teamIds) {
    params.team_ids = Array.isArray(teamIds) ? teamIds : [teamIds];
  }

  const response = await fetchFromBalldontlie('/nba/v1/player_injuries', params);
  return response.data || [];
}

/**
 * 获取球队赛季统计
 * @param {number} teamId - 球队 ID
 * @param {number} season - 赛季年份
 * @returns {Promise<object>} 球队统计
 */
async function getTeamSeasonStats(teamId, season) {
  const currentYear = new Date().getFullYear();
  const targetSeason = season || currentYear;

  const response = await fetchFromBalldontlie('/nba/v1/team_season_stats', {
    team_id: teamId,
    season: targetSeason
  });
  return response.data?.[0] || null;
}

/**
 * 获取球队列表
 * @returns {Promise<Array>} 球队数组
 */
async function getTeams() {
  const response = await fetchFromBalldontlie('/nba/v1/teams');
  return response.data || [];
}

/**
 * 根据球队名称获取球队 ID
 * @param {string} teamName - 球队全名或缩写
 * @returns {Promise<number|null>} 球队 ID
 */
async function getTeamId(teamName) {
  const teams = await getTeams();
  const nameLower = teamName.toLowerCase();

  const team = teams.find(t =>
    t.full_name.toLowerCase().includes(nameLower) ||
    t.name.toLowerCase().includes(nameLower) ||
    t.abbreviation.toLowerCase() === nameLower
  );

  return team?.id || null;
}

module.exports = {
  getGames,
  getStandings,
  getInjuries,
  getTeamSeasonStats,
  getTeams,
  getTeamId,
};
