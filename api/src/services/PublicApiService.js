// polysportsclaw-api/src/services/PublicApiService.js

const { getGames, getStandings, getInjuries } = require('./BallDontLieService');
const { getGameOdds } = require('./PolymarketService');
const { getTeamLogoUrl } = require('../utils/espn-mapping');

/**
 * 解析 BallDontLie API 返回的 status 字段
 * @param {object} game - BallDontLie 游戏对象
 * @returns {object} 包含状态信息的对象
 */
function parseGameStatus(game) {
  const status = (game.status || '').toLowerCase();
  const gameTime = new Date(game.datetime || game.date);
  const now = new Date();

  // 判断是否已结束
  const isFinal = status.includes('final');

  // 判断是否中场休息
  const isHalftime = status === 'halftime';

  // 判断是否进行中
  const isLive = !isFinal && (
    status.includes('qtr') ||
    status.includes('ot') ||
    status === 'halftime' ||
    (game.period > 0 && game.time)
  );

  // 如果 BDL 没有提供状态，基于时间推断
  let gameStatus = 'scheduled';
  if (isFinal) {
    gameStatus = 'final';
  } else if (isLive) {
    gameStatus = 'live';
  } else if (gameTime <= now) {
    // 比赛时间已过但没有状态信息，可能正在进行
    const hoursSinceStart = (now - gameTime) / (1000 * 60 * 60);
    if (hoursSinceStart >= 0 && hoursSinceStart < 3) {
      gameStatus = 'in_progress';  // 推断中
    } else if (hoursSinceStart >= 3) {
      gameStatus = 'final';  // 超过3小时，推断已结束
    }
  }

  return {
    status: gameStatus,
    statusText: game.status || null,  // 原始状态文本 (如 "4th Qtr", "Final")
    period: game.period || null,
    clock: game.time || null,
    isLive: gameStatus === 'live' || gameStatus === 'in_progress',
    isFinal: gameStatus === 'final',
    isHalftime: isHalftime,
  };
}

/**
 * 带超时的 Promise 包装器
 */
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Aggregates NBA game data from BallDontLie, Polymarket, and ESPN CDN.
 * @param {boolean} includeOdds - Whether to fetch Polymarket odds (slower). Default: false
 * @returns {Promise<Array<object>>} An array of unified NBA game data objects.
 */
async function getUnifiedNBAData(includeOdds = false) {
  // 1. 获取 BDL 比赛列表 (今天和未来3天)
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  let bdlGames = [];
  try {
    const gamesResponse = await getGames({ dates: dates });
    bdlGames = gamesResponse.data || [];
  } catch (error) {
    console.error(`[PublicApiService] Failed to fetch games from BallDontLie: ${error.message}`);
    return [];
  }

  // 2. 为每场比赛整合数据
  const results = await Promise.all(bdlGames.map(async (game) => {
    let polymarketOdds = null;
    const gameDate = game.date.split('T')[0];
    const gameDateTime = game.datetime || game.date;

    // 解析游戏状态 (使用 BDL 的 status 字段)
    const statusInfo = parseGameStatus(game);

    // 获取 Polymarket 赔率 (可选)
    if (includeOdds) {
      try {
        const odds = await withTimeout(getGameOdds(
          game.visitor_team.full_name,
          game.home_team.full_name,
          gameDate
        ), 3000);

        if (odds) {
          polymarketOdds = {
            homeWinProbability: odds.homeWin,
            awayWinProbability: odds.awayWin,
            marketId: odds.marketId,
            volume: odds.volume,
          };
        }
      } catch (e) {
        console.warn(`[PublicApiService] Polymarket odds skipped for game ${game.id}: ${e.message}`);
      }
    }

    // 获取球队 Logo URL
    const homeTeamLogo = getTeamLogoUrl(game.home_team.full_name);
    const awayTeamLogo = getTeamLogoUrl(game.visitor_team.full_name);

    return {
      gameId: String(game.id),
      gameTime: gameDateTime,
      // 状态信息
      status: statusInfo.status,
      statusText: statusInfo.statusText,
      period: statusInfo.period,
      clock: statusInfo.clock,
      isLive: statusInfo.isLive,
      isFinal: statusInfo.isFinal,
      isHalftime: statusInfo.isHalftime,
      // 主队
      homeTeam: {
        name: game.home_team.full_name,
        abbreviation: game.home_team.abbreviation,
        logo: homeTeamLogo,
        score: game.home_team_score || 0,
      },
      // 客队
      awayTeam: {
        name: game.visitor_team.full_name,
        abbreviation: game.visitor_team.abbreviation,
        logo: awayTeamLogo,
        score: game.visitor_team_score || 0,
      },
      // Polymarket 赔率
      polymarketOdds: polymarketOdds,
    };
  }));

  return results;
}

/**
 * 获取增强版比赛数据（包含战绩、伤病等）
 * @param {boolean} includeOdds - 是否包含赔率
 * @returns {Promise<object>} 增强的比赛数据
 */
async function getEnhancedNBAData(includeOdds = false) {
  // 1. 获取基础比赛数据
  const games = await getUnifiedNBAData(includeOdds);

  // 2. 并行获取战绩和伤病
  let standings = [];
  let injuries = [];

  try {
    [standings, injuries] = await Promise.all([
      withTimeout(getStandings(), 5000).catch(() => []),
      withTimeout(getInjuries(), 5000).catch(() => [])
    ]);
  } catch (e) {
    console.warn('[PublicApiService] Failed to fetch standings/injuries:', e.message);
  }

  // 3. 构建球队战绩映射 (按球队 ID 或名称)
  const standingsMap = {};
  for (const s of standings) {
    if (s.team?.id) {
      standingsMap[s.team.id] = {
        wins: s.wins,
        losses: s.losses,
        conferenceRank: s.conference_rank,
        divisionRank: s.division_rank,
        homeRecord: s.home_record,
        roadRecord: s.road_record,
        conference: s.team.conference,
      };
    }
  }

  // 4. 构建伤病映射 (按球队 ID)
  const injuriesMap = {};
  for (const injury of injuries) {
    const teamId = injury.player?.team_id || injury.player?.team?.id;
    if (teamId) {
      if (!injuriesMap[teamId]) {
        injuriesMap[teamId] = [];
      }
      injuriesMap[teamId].push({
        playerName: `${injury.player.first_name} ${injury.player.last_name}`,
        position: injury.player.position,
        status: injury.status,
        description: injury.description,
        returnDate: injury.return_date,
      });
    }
  }

  // 5. 增强每场比赛数据
  const enhancedGames = games.map(game => {
    // 找到球队 ID (需要从原始数据中获取，这里基于名称匹配)
    const homeStanding = Object.values(standings).find(s =>
      s.team?.full_name?.toLowerCase() === game.homeTeam.name.toLowerCase()
    );
    const awayStanding = Object.values(standings).find(s =>
      s.team?.full_name?.toLowerCase() === game.awayTeam.name.toLowerCase()
    );

    const homeTeamId = homeStanding?.team?.id;
    const awayTeamId = awayStanding?.team?.id;

    return {
      ...game,
      homeTeam: {
        ...game.homeTeam,
        record: standingsMap[homeTeamId] || null,
        injuries: injuriesMap[homeTeamId] || [],
      },
      awayTeam: {
        ...game.awayTeam,
        record: standingsMap[awayTeamId] || null,
        injuries: injuriesMap[awayTeamId] || [],
      },
    };
  });

  return {
    games: enhancedGames,
    meta: {
      totalGames: enhancedGames.length,
      standingsLoaded: standings.length > 0,
      injuriesLoaded: injuries.length > 0,
      fetchedAt: new Date().toISOString(),
    }
  };
}

/**
 * 根据球队名称查找比赛 ID
 */
async function findGameByTeams(teamA, teamB, date) {
  const today = new Date();
  const dates = date ? [date] : [
    today.toISOString().split('T')[0],
    new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ];

  try {
    const gamesResponse = await getGames({ dates });
    const games = gamesResponse.data || [];

    const teamALower = teamA.toLowerCase();
    const teamBLower = teamB.toLowerCase();

    const found = games.find(game => {
      const homeName = game.home_team.full_name.toLowerCase();
      const awayName = game.visitor_team.full_name.toLowerCase();

      return (
        (homeName.includes(teamALower) || awayName.includes(teamALower)) &&
        (homeName.includes(teamBLower) || awayName.includes(teamBLower))
      );
    });

    return found ? String(found.id) : null;
  } catch (error) {
    console.error(`[PublicApiService] Error finding game: ${error.message}`);
    return null;
  }
}

/**
 * 获取单场比赛的实时数据
 */
async function getLiveGameData(gameId) {
  try {
    // 获取最近几天的比赛找到对应 ID
    const today = new Date();
    const dates = [];
    for (let i = -1; i <= 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const gamesResponse = await getGames({ dates });
    const games = gamesResponse.data || [];
    const game = games.find(g => String(g.id) === String(gameId));

    if (!game) {
      return null;
    }

    const statusInfo = parseGameStatus(game);

    return {
      source: 'balldontlie',
      gameId: String(game.id),
      homeScore: game.home_team_score || 0,
      awayScore: game.visitor_team_score || 0,
      period: statusInfo.period,
      clock: statusInfo.clock,
      status: statusInfo.status,
      statusText: statusInfo.statusText,
      isLive: statusInfo.isLive,
      isFinal: statusInfo.isFinal,
      isHalftime: statusInfo.isHalftime,
      homeTeamName: game.home_team.full_name,
      awayTeamName: game.visitor_team.full_name,
    };
  } catch (error) {
    console.error(`[PublicApiService] Error getting live game data: ${error.message}`);
    return null;
  }
}

module.exports = {
  getUnifiedNBAData,
  getEnhancedNBAData,
  findGameByTeams,
  getLiveGameData,
  parseGameStatus,
};