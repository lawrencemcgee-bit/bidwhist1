import type { Server, Socket } from 'socket.io';
import {
  SERVER_EVENTS,
  TABLE_SIZE,
  isHumanAvatar,
  type BidActionPayload,
  type PlayerKind,
  type PlayerSnapshot,
  type ReplayEvent,
  type SeatIndex,
  type TableState,
} from '@bidwhist/shared';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { GameEngine, EngineError } from './engine.js';
import type { EngineEvent } from './events.js';
import type { SeatPlayer } from './types.js';
import { BotController, type BotHost } from '../bots/botController.js';
import { getBotProfile, pickBotProfile, type BotProfile } from '../bots/avatars.js';
import { mulberry32 } from './deck.js';
import { handleGameEnd, type GameSeatResult } from '../modules/results/gameResults.service.js';

export interface TableSeat {
  seat: SeatIndex;
  userId: string | null;
  username: string;
  kind: PlayerKind;
  avatarId: string;
  botProfileId?: string | null;
  socketId: string | null;
  connected: boolean;
  away: boolean;
}

interface Actor {
  id: string;
  username: string;
  avatarId?: string;
}

export type JoinResult = { ok: true; seat: SeatIndex } | { ok: false; error: string };

export class TableRuntime implements BotHost {
  readonly roomId: string;
  seats: (TableSeat | null)[] = [null, null, null, null];
  engine: GameEngine | null = null;
  status: 'WAITING' | 'PLAYING' | 'FINISHED' = 'WAITING';

  private bots: BotController[] = [];
  private takeovers = new Map<SeatIndex, BotController>();
  private spectators = new Set<string>();
  private rng = mulberry32(Date.now());

  constructor(
    private io: Server,
    readonly tableId: string,
    readonly name: string,
    readonly ownerId: string | null,
  ) {
    this.roomId = `table:${tableId}`;
  }

  engineOrThrow(): GameEngine {
    if (!this.engine) {
      throw new EngineError('ILLEGAL_STATE', 'Game has not started');
    }
    return this.engine;
  }

  seatOfUser(userId: string): SeatIndex | null {
    for (const seat of this.seats) {
      if (seat && seat.userId === userId) return seat.seat;
    }
    return null;
  }

  seatOfSocket(socketId: string): SeatIndex | null {
    for (const seat of this.seats) {
      if (seat && seat.socketId === socketId) return seat.seat;
    }
    return null;
  }

  isFull(): boolean {
    return this.seats.every((seat) => seat !== null);
  }

  humanCount(): number {
    return this.seats.filter((s) => s !== null && s.kind === 'human').length;
  }

  botCount(): number {
    return this.seats.filter((s) => s !== null && s.kind === 'bot').length;
  }

  private nextFreeSeat(preferred?: SeatIndex): SeatIndex | null {
    if (preferred !== undefined && preferred !== null && this.seats[preferred] === null) {
      return preferred;
    }
    for (let i = 0; i < TABLE_SIZE; i++) {
      if (this.seats[i as SeatIndex] === null) return i as SeatIndex;
    }
    return null;
  }

  async addHuman(actor: Actor, socketId: string, preferredSeat?: SeatIndex): Promise<JoinResult> {
    this.spectators.delete(socketId);
    const existing = this.seatOfUser(actor.id);
    if (existing !== null) {
      this.bindSocket(actor.id, socketId);
      return { ok: true, seat: existing };
    }
    if (this.status !== 'WAITING') {
      return { ok: false, error: 'This table has already started a game' };
    }
    const seat = this.nextFreeSeat(preferredSeat);
    if (seat === null) {
      return { ok: false, error: 'This table is full' };
    }
    this.seats[seat] = {
      seat,
      userId: actor.id,
      username: actor.username,
      kind: 'human',
      avatarId: isHumanAvatar(actor.avatarId) ? actor.avatarId : 'human-blue',
      socketId,
      connected: true,
      away: false,
    };
    await this.persistSeat(seat);
    this.broadcast(SERVER_EVENTS.playerJoined, { player: this.playerSnapshot(seat) });
    return { ok: true, seat };
  }

  bindSocket(userId: string, socketId: string, avatarId?: string): void {
    const seat = this.seatOfUser(userId);
    if (seat === null) return;
    const s = this.seats[seat];
    if (s) {
      if (avatarId && isHumanAvatar(avatarId) && s.avatarId !== avatarId) {
        s.avatarId = avatarId;
        void this.persistSeat(seat);
      }
      const wasAway = s.away;
      s.socketId = socketId;
      s.connected = true;
      s.away = false;
      if (wasAway) {
        this.stopTakeover(seat);
        this.broadcast(SERVER_EVENTS.playerBack, { seat });
      }
      this.broadcast(SERVER_EVENTS.playerJoined, { player: this.playerSnapshot(seat) });
    }
  }

  async removeHuman(userId: string): Promise<void> {
    const seat = this.seatOfUser(userId);
    if (seat === null) return;
    if (this.status !== 'WAITING') return;
    this.seats[seat] = null;
    await this.deleteSeat(seat);
    this.broadcast(SERVER_EVENTS.playerLeft, { seat });
  }

  async addBot(): Promise<boolean> {
    if (this.status !== 'WAITING') return false;
    const seat = this.nextFreeSeat();
    if (seat === null) return false;
    const taken = this.seats
      .filter((s) => s !== null && s.kind === 'bot')
      .map((s) => s!.botProfileId)
      .concat([...this.takeovers.keys()].map((s) => this.seats[s]!.botProfileId ?? null));
    const profile = pickBotProfile(taken.filter((id): id is string => id !== null && id !== undefined), this.rng.next);
    this.seats[seat] = {
      seat,
      userId: null,
      username: profile.name,
      kind: 'bot',
      avatarId: profile.id,
      botProfileId: profile.id,
      socketId: null,
      connected: true,
      away: false,
    };
    await this.persistSeat(seat);
    this.broadcast(SERVER_EVENTS.playerJoined, { player: this.playerSnapshot(seat) });
    return true;
  }

  async removeBot(seat: SeatIndex): Promise<boolean> {
    const s = this.seats[seat];
    if (!s || s.kind !== 'bot') return false;
    if (this.status !== 'WAITING') return false;
    this.bots = this.bots.filter((b) => b.seat !== seat);
    this.seats[seat] = null;
    await this.deleteSeat(seat);
    this.broadcast(SERVER_EVENTS.playerLeft, { seat });
    return true;
  }

  async startGame(): Promise<void> {
    if (this.status !== 'WAITING') {
      throw new EngineError('ILLEGAL_STATE', 'Game already in progress');
    }
    if (!this.isFull()) {
      throw new EngineError('NOT_ENOUGH_PLAYERS', 'All four seats must be filled to start');
    }
    this.status = 'PLAYING';

    const players: SeatPlayer[] = this.seats.map((s) => ({
      seat: s!.seat,
      playerId: s!.kind === 'human' ? (s!.userId as string) : (s!.botProfileId as string),
      username: s!.username,
      kind: s!.kind,
      avatarId: s!.avatarId,
      botProfileId: s!.kind === 'bot' ? s!.botProfileId : null,
    }));

    this.engine = new GameEngine(players, { seed: Math.floor(this.rng.next() * 2 ** 31) });
    this.engine.on((event) => {
      this.handleEngineEvent(event);
      for (const bot of this.bots) bot.onEngineEvent(event);
      for (const takeover of this.takeovers.values()) takeover.onEngineEvent(event);
    });
    this.bots = players
      .filter((p) => p.kind === 'bot')
      .map((p) => new BotController(this, getBotProfile(p.botProfileId as string), p.seat));

    if (config.autoBotTakeover) {
      for (let i = 0; i < TABLE_SIZE; i++) {
        const seat = i as SeatIndex;
        const s = this.seats[seat];
        if (s && s.kind === 'human' && !s.connected && s.userId) {
          this.startTakeover(seat);
        }
      }
    }

    await prisma.table.update({ where: { id: this.tableId }, data: { status: 'PLAYING' } });

    this.broadcast(SERVER_EVENTS.gameStarted, { tableId: this.tableId });
    this.broadcastState();
    this.engine.startHand();
    for (const bot of this.bots) bot.greet();
  }

  handleBid(socket: Socket, payload: Extract<BidActionPayload, { tableId: string }>): void {
    const seat = this.actorSeat(socket);
    if (seat === null) return;
    try {
      if (payload.type === 'pass') {
        this.engineOrThrow().bid(seat, null);
      } else {
        this.engineOrThrow().bid(seat, payload.bid);
      }
    } catch (err) {
      this.emitActionError(socket, err);
    }
  }

  handleDiscard(socket: Socket, payload: { cardIds: string[] }): void {
    const seat = this.actorSeat(socket);
    if (seat === null) return;
    try {
      this.engineOrThrow().discard(seat, payload.cardIds);
    } catch (err) {
      this.emitActionError(socket, err);
    }
  }

  handlePlay(socket: Socket, payload: { cardId: string }): void {
    const seat = this.actorSeat(socket);
    if (seat === null) return;
    try {
      this.engineOrThrow().playCard(seat, payload.cardId);
    } catch (err) {
      this.emitActionError(socket, err);
    }
  }

  handleChat(socket: Socket, payload: { text: string }): void {
    const text = payload.text.trim().slice(0, 280);
    if (text.length === 0) return;
    const seat = this.seatOfSocket(socket.id);
    if (seat !== null) {
      const s = this.seats[seat];
      this.broadcast(SERVER_EVENTS.chatMessage, {
        seat,
        username: s!.username,
        avatarId: s!.avatarId,
        text,
        at: Date.now(),
      });
      return;
    }
    if (this.spectators.has(socket.id)) {
      const user = (socket.data.user as { username?: string } | undefined) ?? {};
      this.broadcast(SERVER_EVENTS.chatMessage, {
        seat: null,
        username: user.username ?? 'Spectator',
        avatarId: 'human-blue',
        text,
        at: Date.now(),
      });
    }
  }

  emitBotChat(seat: SeatIndex, profile: BotProfile, text: string): void {
    const s = this.seats[seat];
    this.broadcast(SERVER_EVENTS.chatMessage, {
      seat,
      username: s?.username ?? profile.name,
      avatarId: s?.avatarId ?? profile.id,
      text,
      at: Date.now(),
    });
  }

  handleDisconnect(socketId: string): void {
    this.spectators.delete(socketId);
    const seat = this.seatOfSocket(socketId);
    if (seat === null) return;
    const s = this.seats[seat];
    if (s) {
      s.socketId = null;
      s.connected = false;
      this.broadcast(SERVER_EVENTS.playerLeft, { seat });
      if (this.status === 'PLAYING' && s.kind === 'human' && config.autoBotTakeover) {
        this.startTakeover(seat);
      }
    }
  }

  addSpectator(socket: Socket): boolean {
    if (this.spectators.has(socket.id)) return false;
    const user = socket.data.user as { username?: string } | undefined;
    if (user?.username && this.seatOfUser((socket.data.user as { id?: string } | undefined)?.id ?? '') === null) {
      this.spectators.add(socket.id);
      socket.join(this.roomId);
      this.broadcastSpectators();
      return true;
    }
    return false;
  }

  removeSpectator(socketId: string): void {
    if (!this.spectators.delete(socketId)) return;
    this.broadcastSpectators();
  }

  isSpectator(socketId: string): boolean {
    return this.spectators.has(socketId);
  }

  private broadcastSpectators(): void {
    this.broadcast(SERVER_EVENTS.spectatorCount, { count: this.spectators.size });
  }

  private startTakeover(seat: SeatIndex): void {
    if (!this.engine) return;
    const s = this.seats[seat];
    if (!s || s.kind !== 'human') return;
    if (this.takeovers.has(seat)) return;
    const taken = this.seats
      .filter((x) => x !== null && x.kind === 'bot')
      .map((x) => x!.botProfileId)
      .concat([...this.takeovers.keys()].map((x) => this.seats[x]!.botProfileId ?? null));
    const profile = pickBotProfile(taken.filter((id): id is string => id !== null && id !== undefined), this.rng.next);
    s.botProfileId = profile.id;
    s.away = true;
    const controller = new BotController(this, profile, seat);
    this.takeovers.set(seat, controller);
    this.broadcast(SERVER_EVENTS.playerAway, { seat, botProfileId: profile.id });
    this.broadcastState();
    const state = this.engine.getState();
    const isTurn =
      (state.phase === 'BIDDING' && state.currentBidder === seat) ||
      (state.phase === 'DISCARDING' && state.currentDiscarder === seat) ||
      (state.phase === 'PLAYING' && state.currentPlayer === seat);
    if (isTurn) controller.scheduleAct();
  }

  private stopTakeover(seat: SeatIndex): void {
    const controller = this.takeovers.get(seat);
    if (controller) {
      controller.destroy();
      this.takeovers.delete(seat);
    }
    const s = this.seats[seat];
    if (s) {
      s.botProfileId = null;
      s.away = false;
    }
  }

  sendStateTo(socketId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;
    socket.emit(SERVER_EVENTS.tableState, this.getState());
    if (this.spectators.has(socketId)) {
      socket.emit(SERVER_EVENTS.spectatorCount, { count: this.spectators.size });
      return;
    }
    if (this.engine) {
      const seat = this.seatOfSocket(socketId);
      if (seat !== null) {
        socket.emit(SERVER_EVENTS.tablePrivate, { hand: this.engine.getPrivateHand(seat) });
      }
    }
  }

  getState(): TableState {
    const state = this.engine?.getState();
    return {
      tableId: this.tableId,
      name: this.name,
      ownerId: this.ownerId,
      status: this.status,
      phase: state?.phase ?? 'WAITING',
      players: this.seats.map((s) => (s ? this.playerSnapshot(s.seat) : null)),
      dealerSeat: state?.dealerSeat ?? null,
      handNumber: state?.handNumber ?? 0,
      trickNumber: state?.trickNumber ?? 0,
      currentBidder: state?.currentBidder ?? null,
      currentDiscarder: state?.currentDiscarder ?? null,
      currentPlayer: state?.currentPlayer ?? null,
      currentTrick: state?.currentTrick ?? [],
      biddingHistory: state?.biddingHistory ?? [],
      highestBid: state?.highestBid ?? null,
      declarerSeat: state?.declarerSeat ?? null,
      trump: state?.trump ?? null,
      kittyCount: state?.kitty.length ?? 0,
      spectators: this.spectators.size,
      lastTrickWinner: null,
      finished: state?.finished ?? false,
    };
  }

  private actorSeat(socket: Socket): SeatIndex | null {
    const seat = this.seatOfSocket(socket.id);
    if (seat === null) {
      socket.emit(SERVER_EVENTS.actionError, { code: 'NOT_SEATED', message: 'You are not seated at this table' });
    }
    return seat;
  }

  private playerSnapshot(seat: SeatIndex): PlayerSnapshot {
    const s = this.seats[seat]!;
    const seatState = this.engine?.getState().seats[seat];
    return {
      seat,
      userId: s.userId,
      username: s.username,
      kind: s.kind,
      avatarId: s.avatarId,
      botProfileId: s.botProfileId ?? null,
      connected: s.connected,
      away: s.away,
      score: seatState ? this.engine!.getState().scores[seat] : 0,
      handSize: seatState?.hand.length ?? 0,
    };
  }

  private handleEngineEvent(event: EngineEvent): void {
    switch (event.type) {
      case 'deal':
        this.broadcast(SERVER_EVENTS.gameDeal, {
          handNumber: event.handNumber,
          dealerSeat: event.dealerSeat,
          kittyCount: event.kittyCount,
        });
        for (let i = 0; i < TABLE_SIZE; i++) {
          const seat = i as SeatIndex;
          this.emitPrivate(seat, { hand: this.engine!.getPrivateHand(seat) });
        }
        this.broadcastState();
        break;
      case 'bid:turn':
        this.broadcast(SERVER_EVENTS.bidTurn, { seat: event.seat });
        this.broadcastState();
        break;
      case 'bid:made':
        this.broadcast(SERVER_EVENTS.bidMade, { seat: event.seat, bid: event.bid });
        this.broadcastState();
        break;
      case 'bid:passed':
        this.broadcast(SERVER_EVENTS.bidPassed, { seat: event.seat });
        this.broadcastState();
        break;
      case 'bid:ended':
        this.broadcast(SERVER_EVENTS.bidEnded, {
          declarerSeat: event.declarerSeat,
          bid: event.bid,
          trump: event.trump,
        });
        this.broadcastState();
        break;
      case 'discard:turn':
        if (event.kittyReveal) {
          const hand = this.engine!.getState().seats[event.seat]!.hand;
          this.emitPrivate(event.seat, { hand: [...hand, ...event.kitty] });
        }
        this.broadcast(SERVER_EVENTS.discardTurn, { seat: event.seat, kittyReveal: event.kittyReveal });
        this.broadcastState();
        break;
      case 'discard:made':
        this.broadcast(SERVER_EVENTS.discardMade, {
          seat: event.seat,
          cardIds: event.cardIds,
          passedToSeat: event.passedToSeat ?? undefined,
        });
        this.emitPrivate(event.seat, { hand: this.engine!.getPrivateHand(event.seat) });
        if (event.passedToSeat !== null) {
          this.emitPrivate(event.passedToSeat, { hand: this.engine!.getPrivateHand(event.passedToSeat) });
        }
        this.broadcastState();
        break;
      case 'play:turn':
        this.broadcast(SERVER_EVENTS.playTurn, { seat: event.seat });
        this.broadcastState();
        break;
      case 'card:played':
        this.broadcast(SERVER_EVENTS.cardPlayed, { ...event.played, handSize: event.handSize });
        this.emitPrivate(event.played.seat, { hand: this.engine!.getPrivateHand(event.played.seat) });
        this.broadcastState();
        break;
      case 'trick:won':
        this.broadcast(SERVER_EVENTS.trickWon, {
          winnerSeat: event.winnerSeat,
          trickNumber: event.trickNumber,
          cards: event.cards,
        });
        this.broadcastState();
        break;
      case 'hand:ended':
        this.broadcast(SERVER_EVENTS.handEnded, event.result);
        this.broadcastState();
        break;
      case 'game:ended':
        this.broadcast(SERVER_EVENTS.gameEnded, {
          winnerPartnership: event.winnerPartnership,
          scores: event.scores,
        });
        this.status = 'FINISHED';
        this.broadcastState();
        void this.persistGameResult(event.winnerPartnership, event.scores);
        break;
    }
  }

  private emitPrivate(seat: SeatIndex, payload: { hand: unknown[] }): void {
    const s = this.seats[seat];
    if (!s || s.kind === 'bot' || !s.socketId) return;
    this.io.to(s.socketId).emit(SERVER_EVENTS.tablePrivate, payload);
  }

  private broadcast(event: string, payload: unknown): void {
    this.io.to(this.roomId).emit(event, payload);
  }

  private broadcastState(): void {
    this.io.to(this.roomId).emit(SERVER_EVENTS.tableState, this.getState());
  }

  private emitActionError(socket: Socket, err: unknown): void {
    if (err instanceof EngineError) {
      socket.emit(SERVER_EVENTS.actionError, { code: err.code, message: err.message });
      return;
    }
    throw err;
  }

  private async persistSeat(seat: SeatIndex): Promise<void> {
    const s = this.seats[seat]!;
    if (s.kind === 'human' && s.userId) {
      await prisma.tablePlayer.upsert({
        where: { tableId_userId: { tableId: this.tableId, userId: s.userId } },
        create: {
          tableId: this.tableId,
          userId: s.userId,
          seatIndex: seat,
          isBot: false,
          avatarId: s.avatarId,
        },
        update: { seatIndex: seat },
      });
      return;
    }
    await prisma.tablePlayer.upsert({
      where: { tableId_seatIndex: { tableId: this.tableId, seatIndex: seat } },
      create: {
        tableId: this.tableId,
        seatIndex: seat,
        isBot: true,
        botProfile: s.botProfileId ?? null,
        avatarId: s.avatarId,
      },
      update: { botProfile: s.botProfileId ?? null, avatarId: s.avatarId },
    });
  }

  private async deleteSeat(seat: SeatIndex): Promise<void> {
    const s = this.seats[seat];
    if (!s) return;
    if (s.kind === 'human' && s.userId) {
      await prisma.tablePlayer.deleteMany({ where: { tableId: this.tableId, userId: s.userId } });
    } else {
      await prisma.tablePlayer.deleteMany({ where: { tableId: this.tableId, seatIndex: seat } });
    }
  }

  private async persistGameResult(
    winnerPartnership: 0 | 1,
    scores: [number, number, number, number],
  ): Promise<void> {
    const winnerSeat = winnerPartnership;
    const players = this.seats.map((s) => {
      if (!s) return null;
      return {
        seat: s.seat,
        userId: s.userId,
        username: s.username,
        kind: s.kind,
        avatarId: s.avatarId,
        botProfileId: s.kind === 'bot' ? (s.botProfileId ?? null) : null,
      };
    });
    const replay = this.engine?.getReplay() ?? [];
    await prisma.gameRecord.create({
      data: {
        tableId: this.tableId,
        winnerSeat,
        scores: scores as unknown as object,
        handsPlayed: this.engine?.getState().handNumber ?? 0,
        players: players.filter((p) => p !== null) as object,
        replay: replay as object,
      },
    });
    await prisma.table.update({ where: { id: this.tableId }, data: { status: 'FINISHED' } });

    void this.updatePlayerStats({
      winnerPartnership,
      scores,
      handsPlayed: this.engine?.getState().handNumber ?? 0,
      replay,
      seats: players.filter((p) => p !== null) as unknown as GameSeatResult[],
    });
  }

  private async updatePlayerStats(input: {
    winnerPartnership: 0 | 1;
    scores: [number, number, number, number];
    handsPlayed: number;
    replay: ReplayEvent[];
    seats: GameSeatResult[];
  }): Promise<void> {
    try {
      await handleGameEnd(input);
    } catch (err) {
      console.error('[table] failed to update player stats', err);
    }
  }
}
