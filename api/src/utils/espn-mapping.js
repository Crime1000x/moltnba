// polysportsclaw-api/src/utils/espn-mapping.js

const NBA_TEAM_MAPPING = {
  'Atlanta Hawks': { espnId: '1', abbreviation: 'ATL' },
  'Boston Celtics': { espnId: '2', abbreviation: 'BOS' },
  'Brooklyn Nets': { espnId: '17', abbreviation: 'BKN' },
  'Charlotte Hornets': { espnId: '30', abbreviation: 'CHA' },
  'Chicago Bulls': { espnId: '4', abbreviation: 'CHI' },
  'Cleveland Cavaliers': { espnId: '5', abbreviation: 'CLE' },
  'Dallas Mavericks': { espnId: '6', abbreviation: 'DAL' },
  'Denver Nuggets': { espnId: '7', abbreviation: 'DEN' },
  'Detroit Pistons': { espnId: '8', abbreviation: 'DET' },
  'Golden State Warriors': { espnId: '9', abbreviation: 'GSW' },
  'Houston Rockets': { espnId: '10', abbreviation: 'HOU' },
  'Indiana Pacers': { espnId: '11', abbreviation: 'IND' },
  'LA Clippers': { espnId: '12', abbreviation: 'LAC' },
  'Los Angeles Lakers': { espnId: '13', abbreviation: 'LAL' },
  'Memphis Grizzlies': { espnId: '29', abbreviation: 'MEM' },
  'Miami Heat': { espnId: '14', abbreviation: 'MIA' },
  'Milwaukee Bucks': { espnId: '15', abbreviation: 'MIL' },
  'Minnesota Timberwolves': { espnId: '16', abbreviation: 'MIN' },
  'New Orleans Pelicans': { espnId: '3', abbreviation: 'NOP' },
  'New York Knicks': { espnId: '18', abbreviation: 'NYK' },
  'Oklahoma City Thunder': { espnId: '25', abbreviation: 'OKC' },
  'Orlando Magic': { espnId: '19', abbreviation: 'ORL' },
  'Philadelphia 76ers': { espnId: '20', abbreviation: 'PHI' },
  'Phoenix Suns': { espnId: '21', abbreviation: 'PHX' },
  'Portland Trail Blazers': { espnId: '22', abbreviation: 'POR' },
  'Sacramento Kings': { espnId: '23', abbreviation: 'SAC' },
  'San Antonio Spurs': { espnId: '24', abbreviation: 'SAS' },
  'Toronto Raptors': { espnId: '28', abbreviation: 'TOR' },
  'Utah Jazz': { espnId: '26', abbreviation: 'UTA' },
  'Washington Wizards': { espnId: '27', abbreviation: 'WAS' },
};

function getTeamLogoUrl(teamName) {
  // 特殊处理 Utah Jazz (使用本地上传的 logo)
  if (teamName === 'Utah Jazz' || teamName.toLowerCase().includes('jazz')) {
    return 'https://moltnba.xyz/uta-jazz-logo.jpg';
  }

  // 特殊处理 New Orleans Pelicans (使用本地上传的 logo)
  if (teamName === 'New Orleans Pelicans' || teamName.toLowerCase().includes('pelicans')) {
    return 'https://moltnba.xyz/teams/pelicans.png';
  }

  // 1. 精确匹配
  if (NBA_TEAM_MAPPING[teamName]) {
    const abbr = NBA_TEAM_MAPPING[teamName].abbreviation;
    return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr.toLowerCase()}.png`;
  }

  // 2. 模糊匹配（支持简称如 "Lakers"）
  const normalizedInput = teamName.toLowerCase().trim();

  for (const [fullName, data] of Object.entries(NBA_TEAM_MAPPING)) {
    const normalizedFull = fullName.toLowerCase();

    // 匹配队名（如 "Lakers" -> "Los Angeles Lakers"）
    const teamNickname = fullName.split(' ').pop()?.toLowerCase();
    if (teamNickname && normalizedInput.includes(teamNickname)) {
      return `https://a.espncdn.com/i/teamlogos/nba/500/${data.abbreviation.toLowerCase()}.png`;
    }

    // 匹配城市名（如 "Los Angeles" -> "Los Angeles Lakers"）
    if (normalizedFull.includes(normalizedInput)) {
      return `https://a.espncdn.com/i/teamlogos/nba/500/${data.abbreviation.toLowerCase()}.png`;
    }
  }

  // 3. 默认 logo (返回 null，前端处理）
  return null;
}

module.exports = {
  NBA_TEAM_MAPPING,
  getTeamLogoUrl,
};