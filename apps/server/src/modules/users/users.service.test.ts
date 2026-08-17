import { describe, expect, it, vi } from 'vitest';
import { getProfile } from './users.service.js';

const h = vi.hoisted(() => {
  const user = {
    id: 'u1',
    username: 'Player One',
    avatarId: 'human-blue',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    gamesPlayed: 10,
    wins: 4,
    rating: 1300,
  };
  const ratingHistory = [
    { rating: 1200, changedAt: new Date('2026-01-02T00:00:00Z') },
    { rating: 1300, changedAt: new Date('2026-01-03T00:00:00Z') },
  ];
  const records = [
    {
      id: 'rec-1',
      tableId: 'table-1',
      winnerSeat: 0,
      scores: [7, 3, 7, 3],
      handsPlayed: 5,
      players: [
        { seat: 0, userId: 'u1', username: 'Player One', kind: 'human', avatarId: 'human-blue' },
        { seat: 1, username: 'Bot', kind: 'bot', avatarId: 'bot-1' },
        { seat: 2, username: 'Bot2', kind: 'bot', avatarId: 'bot-2' },
        { seat: 3, username: 'Bot3', kind: 'bot', avatarId: 'bot-3' },
      ],
      playedAt: new Date('2026-01-03T12:00:00Z'),
      table: { name: 'Table 1' },
    },
  ];

  return {
    user,
    ratingHistory,
    records,
    prisma: {
      user: {
        findUnique: async () => ({ ...h.user }),
      },
      ratingHistory: {
        findMany: async () => h.ratingHistory.map((r) => ({ ...r })),
      },
      gameRecord: {
        findMany: async () => h.records.map((r) => ({ ...r })),
      },
    },
  };
});

vi.mock('../../lib/prisma.js', () => ({ prisma: h.prisma }));

describe('getProfile', () => {
  it('returns a profile with stats, rating history, and recent games', async () => {
    const profile = await getProfile('u1');

    expect(profile).not.toBeNull();
    expect(profile?.username).toBe('Player One');
    expect(profile?.rating).toBe(1300);
    expect(profile?.stats).toEqual({ gamesPlayed: 10, wins: 4, losses: 6, winRate: 40 });
    expect(profile?.ratingHistory).toHaveLength(2);
    expect(profile?.ratingHistory[0]).toEqual({
      rating: 1200,
      at: '2026-01-02T00:00:00.000Z',
    });
    expect(profile?.recentGames).toHaveLength(1);
    expect(profile?.recentGames[0]?.tableName).toBe('Table 1');
    expect(profile?.recentGames[0]?.winnerLabel).toBe('NS');
  });

  it('returns null when the user does not exist', async () => {
    const prisma = h.prisma as unknown as { user: { findUnique: (args: unknown) => Promise<unknown> } };
    const original = prisma.user.findUnique;
    prisma.user.findUnique = async () => null;
    const profile = await getProfile('nope');
    expect(profile).toBeNull();
    prisma.user.findUnique = original;
  });
});
