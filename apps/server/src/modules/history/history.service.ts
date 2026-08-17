import type { HistoryEntry, HistoryPlayer, ReplayEvent, ReplayResponse } from '@bidwhist/shared';
import { prisma } from '../../lib/prisma.js';

function partnershipLabel(partnership: 0 | 1): string {
  return partnership === 0 ? 'NS' : 'EW';
}

export async function listHistory(userId: string, limit = 50): Promise<HistoryEntry[]> {
  const records = await prisma.gameRecord.findMany({
    where: {
      OR: [{ table: { ownerId: userId } }, { table: { players: { some: { userId } } } }],
    },
    orderBy: { playedAt: 'desc' },
    take: limit,
    include: {
      table: { select: { name: true, ownerId: true } },
    },
  });

  return records.map((record) => {
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
}

export async function getReplay(userId: string, gameId: string): Promise<ReplayResponse | null> {
  const record = await prisma.gameRecord.findFirst({
    where: {
      id: gameId,
      OR: [{ table: { ownerId: userId } }, { table: { players: { some: { userId } } } }],
    },
    include: { table: { select: { name: true } } },
  });
  if (!record) return null;

  const rawPlayers = record.players as unknown as HistoryPlayer[] | null;
  const rawReplay = record.replay as unknown as ReplayEvent[] | null;
  const players: HistoryPlayer[] = Array.isArray(rawPlayers)
    ? rawPlayers
    : (record.scores as unknown as number[]).map((_score, index) => ({
        seat: index,
        username: `Seat ${index + 1}`,
        kind: 'bot',
        avatarId: 'human-slate',
      }));

  return {
    gameId: record.id,
    tableName: record.table.name,
    playedAt: record.playedAt.toISOString(),
    players,
    replay: Array.isArray(rawReplay) ? rawReplay : [],
  };
}
