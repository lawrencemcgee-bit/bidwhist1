import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { CLIENT_EVENTS, SERVER_EVENTS, type Card, type TableState } from '@bidwhist/shared';
import { signToken } from '../lib/jwt.js';
import { configureSocket } from '../socket/configureSocket.js';
import { chooseBid, chooseDiscard, choosePlay } from '../bots/strategy.js';
import { PERSONALITY_TRAITS } from '../bots/personalities.js';
import { legalPlays, leadSuitOf } from '../game/evaluator.js';
import { mulberry32 } from '../game/deck.js';

const h = vi.hoisted(() => {
  const store: {
    table: Map<string, Record<string, unknown>>;
    players: Map<string, Record<string, unknown>>;
    records: Record<string, unknown>[];
    users: Map<string, Record<string, unknown>>;
    achievements: Record<string, unknown>[];
  } = {
    table: new Map([
      ['table-e2e', { id: 'table-e2e', name: 'E2E Table', ownerId: 'user-human', status: 'WAITING' }],
    ]),
    players: new Map(),
    records: [],
    users: new Map([
      [
        'user-human',
        {
          id: 'user-human',
          email: 'human@example.com',
          username: 'Human',
          avatarId: 'human-blue',
          gamesPlayed: 0,
          wins: 0,
          rating: 1200,
        },
      ],
    ]),
    achievements: [],
  };

  function matches(record: Record<string, unknown>, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => record[key] === value);
  }

  return {
    store,
    prisma: {
      table: {
        findUnique: async ({ where }: { where: { id: string } }) => store.table.get(where.id) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = store.table.get(where.id);
          if (row) Object.assign(row, data);
          return row;
        },
      },
      tablePlayer: {
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const key = JSON.stringify(where);
          const existing = store.players.get(key);
          if (existing) Object.assign(existing, update);
          else store.players.set(key, { ...create });
          return store.players.get(key);
        },
        deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
          for (const [key, value] of store.players) {
            if (matches(value, where)) store.players.delete(key);
          }
          return { count: 0 };
        },
      },
      gameRecord: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const record = { id: `rec-${store.records.length}`, ...data };
          store.records.push(record);
          return record;
        },
      },
      user: {
        findMany: async ({
          where,
          select,
        }: {
          where?: { id?: { in: string[] } };
          select?: Record<string, boolean>;
        }) => {
          let rows = [...store.users.values()];
          if (where?.id?.in) rows = rows.filter((row) => where.id!.in!.includes(row.id as string));
          if (select) {
            rows = rows.map((row) =>
              Object.fromEntries(Object.entries(row).filter(([key]) => select[key])),
            );
          }
          return rows;
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = store.users.get(where.id);
          if (row) Object.assign(row, data);
          return row;
        },
      },
      userAchievement: {
        findMany: async ({ where }: { where: { userId: string; achievementId?: { in: string[] } } }) => {
          return store.achievements.filter(
            (a) =>
              a.userId === where.userId &&
              (!where.achievementId?.in || where.achievementId.in.includes(a.achievementId as string)),
          );
        },
        createMany: async ({
          data,
        }: {
          data: Array<Record<string, unknown>>;
        }) => {
          store.achievements.push(...data);
          return { count: data.length };
        },
      },
    },
  };
});

vi.mock('../lib/prisma.js', () => ({ prisma: h.prisma }));

const TABLE_ID = 'table-e2e';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    await sleep(10);
  }
}

describe('socket end-to-end game', () => {
  let httpServer: HttpServer;
  let ioServer: Server;
  let socket: ClientSocket;
  let token: string;

  let mySeat: number | null = null;
  let hand: Card[] = [];
  let state: TableState | null = null;
  let seated = 0;
  let sawBidHistory = false;
  let sawDealer = false;
  let sawKitty = false;
  let sawPlaying = false;
  let maxTrick = 0;
  let maxHandSeen = 0;

  beforeAll(async () => {
    token = signToken({ sub: 'user-human', email: 'human@example.com', username: 'Human' });

    httpServer = createServer();
    ioServer = new Server(httpServer);
    configureSocket(ioServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;

    socket = ioc(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    const traits = PERSONALITY_TRAITS.Analytical;
    const rng = mulberry32(42).next;

    socket.on(SERVER_EVENTS.tableState, (s: TableState) => {
      state = s;
      seated = s.players.filter(Boolean).length;
      if (mySeat === null) {
        const index = s.players.findIndex((p) => p?.userId === 'user-human');
        if (index !== -1) mySeat = index;
      }
      if (s.phase === 'BIDDING') {
        if (s.biddingHistory.length > 0) sawBidHistory = true;
        if (s.dealerSeat !== null) sawDealer = true;
        if (s.kittyCount === 2) sawKitty = true;
      }
      if (s.phase === 'PLAYING') sawPlaying = true;
      if (s.trickNumber > maxTrick) maxTrick = s.trickNumber;
    });

    socket.on(SERVER_EVENTS.playerJoined, () => {
      seated += 1;
    });

    socket.on(SERVER_EVENTS.playerLeft, () => {
      seated = Math.max(0, seated - 1);
    });

    socket.on(SERVER_EVENTS.tablePrivate, (p: { hand: Card[] }) => {
      hand = p.hand;
      if (hand.length > maxHandSeen) maxHandSeen = hand.length;
    });

    socket.on(SERVER_EVENTS.bidTurn, ({ seat }: { seat: number }) => {
      if (seat !== mySeat || !state) return;
      const bid = chooseBid(hand, state.highestBid, traits, rng);
      socket.emit(CLIENT_EVENTS.bidAction, {
        tableId: TABLE_ID,
        type: bid ? 'bid' : 'pass',
        ...(bid ? { bid } : {}),
      });
    });

    socket.on(SERVER_EVENTS.discardTurn, ({ seat }: { seat: number }) => {
      if (seat !== mySeat || !state) return;
      const ids = chooseDiscard(hand, state.trump!, 2);
      socket.emit(CLIENT_EVENTS.discardCards, { tableId: TABLE_ID, cardIds: ids });
    });

    socket.on(SERVER_EVENTS.playTurn, ({ seat }: { seat: number }) => {
      if (seat !== mySeat || !state || !state.trump) return;
      const lead = state.currentTrick.length > 0 ? leadSuitOf(state.currentTrick[0]!.card) : null;
      const legal = legalPlays(hand, lead);
      const cardId = choosePlay(
        hand,
        legal,
        state.currentTrick,
        state.trump,
        seat as 0 | 1 | 2 | 3,
        traits,
        rng,
        state.trickNumber,
      );
      socket.emit(CLIENT_EVENTS.playCard, { tableId: TABLE_ID, cardId });
    });
  });

  afterAll(async () => {
    socket.disconnect();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('plays a full game over the wire to completion', async () => {
    socket.emit(CLIENT_EVENTS.tableJoin, { tableId: TABLE_ID, avatarId: 'human-blue' });
    await waitFor(() => mySeat !== null);
    expect(seated).toBe(1);

    for (let i = 0; i < 3; i++) {
      socket.emit(CLIENT_EVENTS.botAdd, { tableId: TABLE_ID });
    }
    await waitFor(() => seated === 4);

    const gameEnded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('e2e game did not finish in time')), 30000);
      socket.on(SERVER_EVENTS.gameEnded, () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on(SERVER_EVENTS.actionError, (e: { message: string }) => {
        clearTimeout(timer);
        reject(new Error(`unexpected action error: ${e.message}`));
      });
    });

    socket.emit(CLIENT_EVENTS.gameStart, { tableId: TABLE_ID });
    await gameEnded;

    expect(state?.finished).toBe(true);
    expect(state?.status).toBe('FINISHED');
    expect(sawBidHistory).toBe(true);
    expect(sawDealer).toBe(true);
    expect(sawKitty).toBe(true);
    expect(sawPlaying).toBe(true);
    expect(maxTrick).toBeGreaterThan(1);
    expect(maxHandSeen).toBeGreaterThanOrEqual(13);
    expect(h.store.records.length).toBeGreaterThanOrEqual(1);
    expect(h.store.records[0]?.replay).toBeDefined();

    await waitFor(() => ((h.store.users.get('user-human')?.gamesPlayed as number) ?? 0) >= 1);
    expect(h.store.users.get('user-human')?.gamesPlayed).toBe(1);
    expect(h.store.users.get('user-human')?.wins).toBeGreaterThanOrEqual(0);
    expect(h.store.achievements.some((a) => a.achievementId === 'first-game')).toBe(true);
  }, 40000);
});
