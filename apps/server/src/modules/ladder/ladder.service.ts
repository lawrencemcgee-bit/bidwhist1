import type { LadderEntry } from '@bidwhist/shared';
import { prisma } from '../../lib/prisma.js';

export async function getLadder(limit = 100): Promise<LadderEntry[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
    take: limit,
    select: {
      id: true,
      username: true,
      avatarId: true,
      rating: true,
      gamesPlayed: true,
      wins: true,
    },
  });

  return users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    avatarId: user.avatarId,
    rating: user.rating,
    gamesPlayed: user.gamesPlayed,
    wins: user.wins,
  }));
}

export async function getMyRank(userId: string): Promise<number> {
  const users = await prisma.user.findMany({
    orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
    select: { id: true },
  });
  const index = users.findIndex((user) => user.id === userId);
  return index === -1 ? 0 : index + 1;
}
