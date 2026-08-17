import { KITTY_SIZE, TRICKS_PER_HAND, type Bid, type Card, type Trump } from '@bidwhist/shared';
import type { EngineEvent, EngineListener } from './events.js';
import type { EngineSeatState, EngineState, PlayedCard, SeatIndex, SeatPlayer } from './types.js';
import { deal, mulberry32, type Rng } from './deck.js';
import { isLegalBid, nextSeat, openBidder, partnerSeat } from './bidding.js';
import { leadSuitOf, legalPlays, resolveTrick } from './evaluator.js';
import { scoreHand } from './scoring.js';

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface EngineOptions {
  seed?: number;
}

export class GameEngine {
  private state: EngineState;
  private rng: Rng;
  private listeners: EngineListener[] = [];

  constructor(players: SeatPlayer[], options: EngineOptions = {}) {
    this.rng = mulberry32(options.seed ?? Date.now());
    this.state = this.initState(players);
  }

  on(listener: EngineListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private initState(players: SeatPlayer[]): EngineState {
    if (players.length !== 4) {
      throw new EngineError('BAD_SEATS', 'A game requires exactly 4 seated players');
    }
    const seats: EngineSeatState[] = players.map((player) => ({
      player,
      hand: [],
      tricksTaken: 0,
    }));
    return {
      phase: 'WAITING',
      handNumber: 0,
      dealerSeat: null,
      seats,
      kitty: [],
      pendingPassCards: [],
      currentBidder: null,
      currentDiscarder: null,
      biddingHistory: [],
      highestBid: null,
      lastBidder: null,
      declarerSeat: null,
      trump: null,
      currentTrickLeader: null,
      currentPlayer: null,
      currentTrick: [],
      trickNumber: 0,
      scores: [0, 0, 0, 0],
      finished: false,
    };
  }

  getState(): EngineState {
    return this.state;
  }

  getPrivateHand(seat: SeatIndex): Card[] {
    return this.state.seats[seat]!.hand.map((c) => ({ ...c }));
  }

  startHand(): EngineState {
    const s = this.state;
    if (s.phase !== 'WAITING' && s.phase !== 'HAND_OVER' && s.phase !== 'BIDDING') {
      throw new EngineError('ILLEGAL_STATE', `Cannot deal while phase is ${s.phase}`);
    }
    s.handNumber += 1;
    if (s.phase !== 'BIDDING') {
      s.dealerSeat = s.dealerSeat === null ? 0 : nextSeat(s.dealerSeat);
    }
    const dealerSeat = s.dealerSeat as SeatIndex;
    s.phase = 'DEALING';

    const { hands, kitty } = deal(this.rng);
    for (let i = 0; i < 4; i++) {
      const seat = i as SeatIndex;
      s.seats[seat]!.hand = hands[seat];
      s.seats[seat]!.tricksTaken = 0;
    }
    s.kitty = kitty;
    s.pendingPassCards = [];
    s.currentBidder = null;
    s.currentDiscarder = null;
    s.biddingHistory = [];
    s.highestBid = null;
    s.lastBidder = null;
    s.declarerSeat = null;
    s.trump = null;
    s.currentTrickLeader = null;
    s.currentPlayer = null;
    s.currentTrick = [];
    s.trickNumber = 1;

    this.emit({ type: 'deal', handNumber: s.handNumber, dealerSeat, kittyCount: kitty.length });

    s.phase = 'BIDDING';
    s.currentBidder = openBidder(dealerSeat);
    this.emit({ type: 'bid:turn', seat: s.currentBidder });
    return s;
  }

  bid(seat: SeatIndex, bid: Bid | null): void {
    const s = this.state;
    this.assertPhase('BIDDING');
    if (s.currentBidder !== seat) {
      throw new EngineError('NOT_YOUR_TURN', 'It is not your turn to bid');
    }
    if (bid !== null && !isLegalBid(s.highestBid, bid)) {
      throw new EngineError('ILLEGAL_BID', 'Bid must exceed the current high bid');
    }

    s.biddingHistory.push({ seat, bid });
    if (bid === null) {
      this.emit({ type: 'bid:passed', seat });
    } else {
      s.highestBid = bid;
      s.lastBidder = seat;
      this.emit({ type: 'bid:made', seat, bid });
    }

    const passesInARow = this.consecutivePasses();
    if (bid === null && s.highestBid !== null && passesInARow >= 3) {
      this.endBidding();
      return;
    }
    if (bid === null && s.highestBid === null && passesInARow >= 4) {
      this.startHand();
      return;
    }

    s.currentBidder = nextSeat(seat);
    this.emit({ type: 'bid:turn', seat: s.currentBidder });
  }

  discard(seat: SeatIndex, cardIds: string[]): void {
    const s = this.state;
    this.assertPhase('DISCARDING');
    if (s.currentDiscarder !== seat) {
      throw new EngineError('NOT_YOUR_TURN', 'It is not your turn to discard');
    }
    if (cardIds.length !== KITTY_SIZE) {
      throw new EngineError('ILLEGAL_DISCARD', `Must discard exactly ${KITTY_SIZE} cards`);
    }

    const seatState = s.seats[seat]!;

    if (seat === s.declarerSeat) {
      seatState.hand.push(...s.kitty);
      s.kitty = [];
      const discarded = this.takeCards(seatState, cardIds);
      s.pendingPassCards = discarded;
      const partner = partnerSeat(seat);
      s.seats[partner]!.hand.push(...discarded);
      s.currentDiscarder = partner;
      this.emit({ type: 'discard:made', seat, cardIds, passedToSeat: partner });
      this.emit({ type: 'discard:turn', seat: partner, kittyReveal: false, kitty: [] });
      return;
    }

    this.takeCards(seatState, cardIds);
    s.pendingPassCards = [];
    s.currentDiscarder = null;
    this.emit({ type: 'discard:made', seat, cardIds, passedToSeat: null });
    this.startPlay();
  }

  playCard(seat: SeatIndex, cardId: string): void {
    const s = this.state;
    this.assertPhase('PLAYING');
    if (s.currentPlayer !== seat) {
      throw new EngineError('NOT_YOUR_TURN', 'It is not your turn to play');
    }
    const seatState = s.seats[seat]!;
    const card = seatState.hand.find((c) => c.id === cardId);
    if (!card) {
      throw new EngineError('ILLEGAL_PLAY', 'Card is not in your hand');
    }
    const leadCard = s.currentTrick.length > 0 ? s.currentTrick[0]!.card : null;
    const leadSuit = leadCard ? leadSuitOf(leadCard) : null;
    const legal = legalPlays(seatState.hand, leadSuit);
    if (!legal.some((c) => c.id === cardId)) {
      throw new EngineError('ILLEGAL_PLAY', 'You must follow suit');
    }

    seatState.hand = seatState.hand.filter((c) => c.id !== cardId);
    s.currentTrick.push({ seat, card });
    this.emit({ type: 'card:played', played: { seat, card }, handSize: seatState.hand.length });

    if (s.currentTrick.length === 4) {
      const winner = resolveTrick(s.currentTrick, s.trump as Trump);
      s.seats[winner]!.tricksTaken += 1;
      const completed = [...s.currentTrick];
      this.emit({ type: 'trick:won', winnerSeat: winner, trickNumber: s.trickNumber, cards: completed });

      if (s.trickNumber >= TRICKS_PER_HAND) {
        this.endHand();
        return;
      }
      s.trickNumber += 1;
      s.currentTrick = [];
      s.currentPlayer = winner;
      this.emit({ type: 'play:turn', seat: winner });
      return;
    }

    s.currentPlayer = nextSeat(seat);
    this.emit({ type: 'play:turn', seat: s.currentPlayer });
  }

  private endBidding(): void {
    const s = this.state;
    const declarerSeat = s.lastBidder as SeatIndex;
    s.declarerSeat = declarerSeat;
    const bid = s.highestBid as Bid;
    const trump = bid.denomination;
    s.trump = trump;
    s.phase = 'DISCARDING';
    s.currentDiscarder = declarerSeat;
    this.emit({ type: 'bid:ended', declarerSeat, bid, trump });
    this.emit({
      type: 'discard:turn',
      seat: declarerSeat,
      kittyReveal: true,
      kitty: s.kitty.map((c) => ({ ...c })),
    });
  }

  private startPlay(): void {
    const s = this.state;
    s.phase = 'PLAYING';
    s.trickNumber = 1;
    s.currentTrick = [];
    const lead = nextSeat(s.declarerSeat as SeatIndex);
    s.currentTrickLeader = lead;
    s.currentPlayer = lead;
    this.emit({ type: 'play:turn', seat: lead });
  }

  private endHand(): void {
    const s = this.state;
    const tricksPerSeat = [0, 1, 2, 3].map((i) => s.seats[i as SeatIndex]!.tricksTaken) as [
      number,
      number,
      number,
      number,
    ];
    const result = scoreHand({
      declarerSeat: s.declarerSeat as SeatIndex,
      bid: s.highestBid as Bid,
      trump: s.trump as Trump,
      tricksPerSeat,
      currentScores: s.scores,
    });
    s.scores = result.scores;
    s.phase = 'HAND_OVER';
    this.emit({ type: 'hand:ended', result });

    if (result.winnerPartnership !== null) {
      s.phase = 'GAME_OVER';
      s.finished = true;
      this.emit({ type: 'game:ended', winnerPartnership: result.winnerPartnership, scores: result.scores });
      return;
    }
    this.startHand();
  }

  private takeCards(seatState: EngineSeatState, cardIds: string[]): Card[] {
    const cards: Card[] = [];
    for (const id of cardIds) {
      const card = seatState.hand.find((c) => c.id === id);
      if (!card) {
        throw new EngineError('ILLEGAL_DISCARD', 'Card is not in your hand');
      }
      cards.push(card);
    }
    seatState.hand = seatState.hand.filter((c) => !cardIds.includes(c.id));
    return cards;
  }

  private consecutivePasses(): number {
    const history = this.state.biddingHistory;
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]!.bid !== null) break;
      count += 1;
    }
    return count;
  }

  private assertPhase(expected: string): void {
    if (this.state.phase !== expected) {
      throw new EngineError('ILLEGAL_STATE', `Action not allowed during phase ${this.state.phase}`);
    }
  }
}
