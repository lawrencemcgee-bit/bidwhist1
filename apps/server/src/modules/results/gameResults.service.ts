import { ACHIEVEMENTS, type ReplayEvent, type SeatIndex } from '@bidwhist/shared';
import { prisma } from '../../lib/prisma.js';
import { STARTING_RATING, eloUpdate, expectedScore } from '../../lib/rating.js';
import { partnershipOf } from '../../game/bidding.js';

export interface GameSeatResult {
  seat: SeatIndex;
  userId: string | null;
  kind: 'human' | 'bot';
  username: string;
  avatarId: string;
  botProfileId: string | null;
}

export interface GameEndInput {
  winnerPartnership: 0 | 1;
  scores: [number, number, number, number];
  handsPlayed: number;
  replay: ReplayEvent[];
  seats: GameSeatResult[];
}

export interface GameEndOutcome {
  unlockedAchievements: string[];
  updatedUsers: Array<{ userId: string; gamesPlayed: number; wins: number; rating: number }>;
}

interface HumanSeat {
  seat: SeatIndex;
  userId: string;
  partnership: 0 | 1;
  won: boolean;
}

function unlockedAchievementIds(seat: HumanSeat, ctx: {
  gamesPlayed: number;
  wins: number;
  handsPlayed: number;
  playerScore: number;
  opponentScore: number;
  replay: ReplayEvent[];
}): string[] {
  const ids: string[] = [];
  if (ctx.gamesPlayed >= 1) ids.push('first-game');
  if (ctx.gamesPlayed >= 10) ids.push('games-10');
  if (ctx.gamesPlayed >= 50) ids.push('games-50');
  if (ctx.wins >= 1) ids.push('first-win');
  if (ctx.wins >= 10) ids.push('wins-10');
  if (seat.won) {
    if (ctx.handsPlayed <= 3) ids.push('fast-start');
    if (ctx.opponentScore === 0) ids.push('shutout');
  }
  const bidHigh = ctx.replay.some(
    (event) =>
      event.type === 'hand:ended' &&
      event.result.made &&
      event.result.bid.tricks >= 12 &&
      partnershipOf(event.result.declarerSeat) === seat.partnership,
  );
  if (bidHigh) ids.push('big-bid');
  return ids;
}

export async function handleGameEnd(input: GameEndInput): Promise<GameEndOutcome> {
  const humans: HumanSeat[] = input.seats
    .filter((s) => s.kind === 'human' && s.userId)
    .map((s) => {
      const partnership = partnershipOf(s.seat);
      return {
        seat: s.seat,
        userId: s.userId as string,
        partnership,
        won: partnership === input.winnerPartnership,
      };
    });

  if (humans.length === 0) {
    return { unlockedAchievements: [], updatedUsers: [] };
  }

  const userIds = humans.map((h) => h.userId);
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, gamesPlayed: true, wins: true, rating: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  const averageRating = (partnership: 0 | 1): number | null => {
    const ratings = humans
      .filter((h) => h.partnership === partnership)
      .map((h) => byId.get(h.userId)?.rating ?? STARTING_RATING);
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  };

  const partnershipScore = (partnership: 0 | 1): number => {
    return input.scores
      .filter((_score, index) => index % 2 === partnership)
      .reduce((sum, score) => sum + score, 0);
  };
  const playerScore = (partnership: 0 | 1): number => partnershipScore(partnership);
  const opponentScore = (partnership: 0 | 1): number =>
    partnershipScore(partnership === 0 ? 1 : 0);

  const unlockedAchievements: string[] = [];
  const updatedUsers: GameEndOutcome['updatedUsers'] = [];

  for (const human of humans) {
    const row = byId.get(human.userId);
    if (!row) continue;
    const gamesPlayed = row.gamesPlayed + 1;
    const wins = row.wins + (human.won ? 1 : 0);

    const opponentAvg = averageRating(human.partnership === 0 ? 1 : 0);
    const expected = opponentAvg === null ? 0.5 : expectedScore(row.rating, opponentAvg);
    const rating = eloUpdate(row.rating, expected, human.won ? 1 : 0);

    await prisma.user.update({
      where: { id: human.userId },
      data: { gamesPlayed, wins, rating },
    });
    await prisma.ratingHistory.create({
      data: { userId: human.userId, rating, changedAt: new Date() },
    });
    updatedUsers.push({ userId: human.userId, gamesPlayed, wins, rating });

    const candidateIds = unlockedAchievementIds(human, {
      gamesPlayed,
      wins,
      handsPlayed: input.handsPlayed,
      playerScore: playerScore(human.partnership),
      opponentScore: opponentScore(human.partnership),
      replay: input.replay,
    });
    if (candidateIds.length === 0) continue;

    const existing = await prisma.userAchievement.findMany({
      where: { userId: human.userId, achievementId: { in: candidateIds } },
      select: { achievementId: true },
    });
    const existingIds = new Set(existing.map((e) => e.achievementId));
    const fresh = candidateIds.filter((id) => !existingIds.has(id));
    if (fresh.length === 0) continue;

    await prisma.userAchievement.createMany({
      data: fresh.map((achievementId) => ({ userId: human.userId, achievementId })),
      skipDuplicates: true,
    });
    unlockedAchievements.push(...fresh);
  }

  return { unlockedAchievements, updatedUsers };
}

export function achievementDefinitions() {
  return ACHIEVEMENTS;
}
