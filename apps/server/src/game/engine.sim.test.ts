import { describe, expect, it } from 'vitest';
import { WINNING_SCORE, type Trump } from '@bidwhist/shared';
import { GameEngine, EngineError } from './engine.js';
import type { SeatPlayer, SeatIndex } from './types.js';
import { chooseBid, chooseDiscard, choosePlay } from '../bots/strategy.js';
import { PERSONALITY_TRAITS } from '../bots/personalities.js';
import { legalPlays, leadSuitOf } from './evaluator.js';
import { mulberry32 } from './deck.js';
import { partnershipOf } from './bidding.js';

function makePlayers(): SeatPlayer[] {
  return [0, 1, 2, 3].map((seat) => ({
    seat: seat as SeatIndex,
    playerId: `bot-${seat}`,
    username: `Bot${seat}`,
    kind: 'bot',
    avatarId: `bot-${seat}`,
    botProfileId: `bot-${seat}`,
  }));
}

function simulate(seed: number): { engine: GameEngine; moves: number } {
  const engine = new GameEngine(makePlayers(), { seed });
  const rng = mulberry32(seed).next;
  const traits = PERSONALITY_TRAITS.Analytical;
  engine.startHand();

  let moves = 0;
  while (engine.getState().phase !== 'GAME_OVER') {
    moves += 1;
    if (moves > 2000) throw new Error('Simulation did not terminate');
    const s = engine.getState();
    if (s.phase === 'BIDDING') {
      const seat = s.currentBidder as SeatIndex;
      const bid = chooseBid(s.seats[seat]!.hand, s.highestBid, traits, rng);
      engine.bid(seat, bid);
    } else if (s.phase === 'DISCARDING') {
      const seat = s.currentDiscarder as SeatIndex;
      const ids = chooseDiscard(s.seats[seat]!.hand, s.trump as Trump, 2);
      engine.discard(seat, ids);
    } else if (s.phase === 'PLAYING') {
      const seat = s.currentPlayer as SeatIndex;
      const hand = s.seats[seat]!.hand;
      const lead = s.currentTrick.length > 0 ? leadSuitOf(s.currentTrick[0]!.card) : null;
      const legal = legalPlays(hand, lead);
      const cardId = choosePlay(hand, legal, s.currentTrick, s.trump as Trump, seat, traits, rng, s.trickNumber);
      engine.playCard(seat, cardId);
    }
  }
  return { engine, moves };
}

describe('game engine integration', () => {
  it('runs a deterministic full game to completion', () => {
    const { engine, moves } = simulate(2024);
    const s = engine.getState();
    expect(s.phase).toBe('GAME_OVER');
    expect(s.finished).toBe(true);
    expect(moves).toBeLessThan(2000);

    const p0 = s.scores[0]!;
    const p1 = s.scores[1]!;
    expect(Math.max(p0, p1)).toBe(WINNING_SCORE);
    expect(Math.min(p0, p1)).toBeLessThan(WINNING_SCORE);
  });

  it('every hand ends with empty hands and legal trick counts', () => {
    const { engine } = simulate(99);
    const s = engine.getState();
    for (const seatState of s.seats) {
      expect(seatState.hand).toHaveLength(0);
    }
    const totalTricks = s.seats.reduce((sum, seatState) => sum + seatState.tricksTaken, 0);
    expect(totalTricks % 13).toBe(0);
  });

  it('rejects an action from the wrong seat', () => {
    const engine = new GameEngine(makePlayers(), { seed: 5 });
    engine.startHand();
    const bidder = engine.getState().currentBidder as SeatIndex;
    const wrongSeat = ((bidder + 1) % 4) as SeatIndex;
    expect(() => engine.bid(wrongSeat, { tricks: 7, denomination: 'C' })).toThrow(EngineError);
  });

  it('rejects illegal bids', () => {
    const engine = new GameEngine(makePlayers(), { seed: 5 });
    engine.startHand();
    const bidder = engine.getState().currentBidder as SeatIndex;
    engine.bid(bidder, { tricks: 9, denomination: 'NT' });
    const nextBidder = engine.getState().currentBidder as SeatIndex;
    expect(() => engine.bid(nextBidder, { tricks: 9, denomination: 'S' })).toThrow(EngineError);
  });

  it('only reveals a player their own hand', () => {
    const engine = new GameEngine(makePlayers(), { seed: 5 });
    engine.startHand();
    const hand0 = engine.getPrivateHand(0);
    const hand1 = engine.getPrivateHand(1);
    expect(hand0).toHaveLength(13);
    const ids0 = new Set(hand0.map((c) => c.id));
    const ids1 = new Set(hand1.map((c) => c.id));
    for (const id of ids1) {
      expect(ids0.has(id)).toBe(false);
    }
  });

  it('partnership scores accumulate and match final winner', () => {
    const { engine } = simulate(777);
    const s = engine.getState();
    const p0 = s.scores[0]! + s.scores[2]!;
    const p1 = s.scores[1]! + s.scores[3]!;
    const winner = p0 > p1 ? 0 : 1;
    const seats = partnershipOf(winner) === 0 ? [0, 2] : [1, 3];
    expect(seats.some((seat) => s.scores[seat]! === WINNING_SCORE)).toBe(true);
  });
});
