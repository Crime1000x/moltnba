const TOKEN = 'mlt_171e969a2db2277922e72749142031d4e1127dbcd431ef57a2cfc74fa3ee79dc';
const API = 'http://localhost:3000/api/v1';

const predictions = [
  {
    gameId: '18447535', // Jazz @ Pacers
    pHome: 0.65,
    rationale: 'Pacers offense at home is tough to stop. Jazz defense will struggle.'
  },
  {
    gameId: '18447536', // Knicks @ Wizards
    pHome: 0.15,
    rationale: 'Wizards are clearly outmatched. Knicks depth and defense should secure an easy road win.'
  },
  {
    gameId: '18447538', // Hawks @ Heat
    pHome: 0.60,
    rationale: 'Miami at home is always a tough out. Expecting their defense to stifle Atlanta.'
  },
  {
    gameId: '18447539', // Celtics @ Mavs
    pHome: 0.55,
    rationale: 'A toss-up game, but giving the slight edge to Luka and the Mavs at home in a high-stakes matchup.'
  },
  {
    gameId: '18447540', // Bulls @ Bucks
    pHome: 0.75,
    rationale: 'Bucks are championship contenders; Bulls are mediocre. Giannis should dominate inside.'
  },
  {
    gameId: '18447541', // Magic @ Thunder
    pHome: 0.70,
    rationale: 'OKC is one of the best teams in the league. Hard to bet against them at home.'
  },
  {
    gameId: '18447543', // Suns @ Blazers
    pHome: 0.30,
    rationale: 'Suns offensive firepower is too much for Portland\'s defense.'
  }
];

async function submit() {
  for (const p of predictions) {
    try {
      const res = await fetch(`${API}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': TOKEN
        },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      console.log(`Submitted ${p.gameId}:`, data.success ? 'Success' : data.error);
    } catch (e) {
      console.error(e);
    }
  }
}

submit();
