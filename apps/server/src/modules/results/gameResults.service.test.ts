import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReplayEvent, SeatIndex } from '@bidwhist/shared';
import type { GameEndInput, GameSeatResult } from './gameResults.service.js';
import { handleGameEnd } from './gameResults.service.js';

const h = vi.hoisted(() => {
  const users = new Map<string, Record<string, unknown>>([
    ['u1', { id: 'u1', gamesPlayed: 0, wins: 0, rating: 1200 }],
    ['u2', { id: 'u2', gamesPlayed: 0, wins: 0, rating: 1200 }],
  ]);
  const achievements: Array<Record<string, unknown>> = [];

  return {
    users,
    achievements,
    prisma: {
      user: {
        findMany: async () => [...users.values()].map((row) => ({ ...row })),
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = users.get(where.id);
          if (row) Object.assign(row, data);
          return { ...row };
        },
      },
      userAchievement: {
        findMany: async ({ where }: { where: { userId: string; achievementId?: { in: string[] } } }) =>
          achievements
            .filter(
              (a) =>
                a.userId === where.userId &&
                (!where.achievementId?.in || where.achievementId.in.includes(a.achievementId as string)),
            )
            .map((a) => ({ ...a })),
        createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
          achievements.push(...data.map((d) => ({ ...d })));
          return { count: data.length };
        },
      },
    },
  };
});

vi.mock('../../lib/prisma.js', () => ({ prisma: h.prisma }));

const replayBase: ReplayEvent[] = [];

function seat(
  seat: SeatIndex,
  userId: string | null,
  kind: 'human' | 'bot',
  botProfileId: string | null = null,
): GameSeatResult {
  return {
    seat,
    userId,
    kind,
    username: userId ?? `Bot ${seat}`,
    avatarId: 'human-blue',
    botProfileId,
  };
}

function input(overrides: Partial<GameEndInput> = {}): GameEndInput {
  return {
    winnerPartnership: 0,
    scores: [7, 3, 7, 3],
    handsPlayed: 5,
    replay: replayBase,
    seats: [seat(0, 'u1', 'human'), seat(1, 'u2', 'human'), seat(2, null, 'bot'), seat(3, null, 'bot')],
    ...overrides,
  };
}

beforeEach(() => {
  h.users.set('u1', { id: 'u1', gamesPlayed: 0, wins: 0, rating: 1200 });
  h.users.set('u2', { id: 'u2', gamesPlayed: 0, wins: 0, rating: 1200 });
  h.achievements.length = 0;
});

describe('handleGameEnd', () => {
  it('updates gamesPlayed and wins for winning and losing humans', async () => {
    const result = await handleGameEnd(input({ winnerPartnership: 0 }));

    expect(h.users.get('u1')).toMatchObject({ gamesPlayed: 1, wins: 1 });
    expect(h.users.get('u2')).toMatchObject({ gamesPlayed: 1, wins: 0 });
    expect(result.updatedUsers).toHaveLength(2);
  });

  it('gives the winner a higher rating than the loser', async () => {
    await handleGameEnd(input({ winnerPartnership: 0 }));

    const u1 = h.users.get('u1')!.rating as number;
    const u2 = h.users.get('u2')!.rating as number;
    expect(u1).toBeGreaterThan(1200);
    expect(u2).toBeLessThan(1200);
  });

  it('is a no-op when there are no human players', async () => {
    const result = await handleGameEnd(
      input({
        seats: [
          seat(0, null, 'bot', 'b1'),
          seat(1, null, 'bot', 'b2'),
          seat(2, null, 'bot', 'b3'),
          seat(3, null, 'bot', 'b4'),
        ],
      }),
    );
    expect(result.unlockedAchievements).toEqual([]);
    expect(result.updatedUsers).toEqual([]);
    expect(h.users.get('u1')).toMatchObject({ gamesPlayed: 0 });
  });

  it('unlocks first-game and first-win for the winning player', async () => {
    const result = await handleGameEnd(input({ winnerPartnership: 0 }));
    expect(result.unlockedAchievements).toContain('first-game');
    expect(result.unlockedAchievements).toContain('first-win');
  });

  it('does not re-unlock achievements on subsequent games', async () => {
    await handleGameEnd(input({ winnerPartnership: 0 }));
    const second = await handleGameEnd(input({ winnerPartnership: 0 }));
    expect(second.unlockedAchievements).not.toContain('first-game');
    expect(second.unlockedAchievements).not.toContain('first-win');
  });

  it('unlocks big-bid when a 12+ trick bid was made and won', async () => {
    const replay: ReplayEvent[] = [
      {
        type: 'hand:ended',
        result: {
          declarerSeat: 0,
          bid: { tricks: 12, denomination: 'H' },
          trump: 'H',
          tricksPerSeat: [12, 0, 1, 0],
          made: true,
          pointsPerSeat: [2, 0, 0, 0],
          scores: [7, 0, 7, 0],
          winnerPartnership: 0,
        },
      },
    ];
    const result = await handleGameEnd(input({ replay }));
    expect(result.unlockedAchievements).toContain('big-bid');
  });

  it('unlocks shutout when opponents score zero', async () => {
    const result = await handleGameEnd(input({ scores: [7, 0, 7, 0], winnerPartnership: 0 }));
    expect(result.unlockedAchievements).toContain('shutout');
  });
});
