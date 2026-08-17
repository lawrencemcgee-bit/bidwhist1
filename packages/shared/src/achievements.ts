export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-game', name: 'First Deal', description: 'Play your first game.' },
  { id: 'games-10', name: 'Regular', description: 'Play 10 games.' },
  { id: 'games-50', name: 'Veteran', description: 'Play 50 games.' },
  { id: 'first-win', name: 'First Win', description: 'Win your first game.' },
  { id: 'wins-10', name: 'Ten Wins', description: 'Win 10 games.' },
  { id: 'big-bid', name: 'High Roller', description: 'Win a hand on a bid of 12 or more.' },
  { id: 'fast-start', name: 'Fast Start', description: 'Win the game in three hands or fewer.' },
  { id: 'shutout', name: 'Shutout', description: 'Win a game while the opponents score zero.' },
];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];
