import type { HistoryEntry, HistoryPlayer, ProfileDto, RatingPoint } from '@bidwhist/shared';
import { prisma } from '../../lib/prisma.js';

function partnershipLabel(partnership: 0 | 1): string {
  return partnership === 0 ? 'NS' : 'EW';
}

export async function getProfile(userId: string): Promise<ProfileDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarId: true,
      createdAt: true,
      gamesPlayed: true,
      wins: true,
      rating: true,
    },
  });
  if (!user) return null;

  const ratingHistoryRows = await prisma.ratingHistory.findMany({
    where: { userId },
    orderBy: { changedAt: 'desc' },
    take: 30,
    select: { rating: true, changedAt: true },
  });
  const ratingHistory: RatingPoint[] = ratingHistoryRows.map((row) => ({
    rating: row.rating,
    at: row.changedAt.toISOString(),
  }));

  const records = await prisma.gameRecord.findMany({
    where: { table: { players: { some: { userId } } } },
    orderBy: { playedAt: 'desc' },
    take: 10,
    include: { table: { select: { name: true } } },
  });
  const recentGames: HistoryEntry[] = records.map((record) => {
    const rawScores = record.scores as unknown as number[];
    const rawPlayers = record.players as unknown as HistoryPlayer[] | null;
    const winnerPartnership = record.winnerSeat as 0 | 1;
    const players: HistoryPlayer[] = Array.isArray(rawPlayers)
      ? rawPlayers
      : rawScores.map((_score, index) => ({
          seat: index,
          username: `Seat ${index + 1}`,
          kind: 'bot',
          avatarId: 'human-slate',
        }));
    return {
      id: record.id,
      tableId: record.tableId,
      tableName: record.table.name,
      playedAt: record.playedAt.toISOString(),
      handsPlayed: record.handsPlayed,
      winnerPartnership,
      winnerLabel: partnershipLabel(winnerPartnership),
      scores: rawScores,
      players,
    };
  });

  const losses = Math.max(0, user.gamesPlayed - user.wins);
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  return {
    userId: user.id,
    username: user.username,
    avatarId: user.avatarId,
    createdAt: user.createdAt.toISOString(),
    rating: user.rating,
    stats: { gamesPlayed: user.gamesPlayed, wins: user.wins, losses, winRate },
    ratingHistory,
    recentGames,
  };
}
