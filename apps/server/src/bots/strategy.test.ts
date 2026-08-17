import { describe, expect, it } from 'vitest';
import type { Card, Rank, Suit } from '@bidwhist/shared';
import { isLegalBid } from '../game/bidding.js';
import type { PlayedCard, SeatIndex } from '../game/types.js';
import { analyzeHand, chooseBid, choosePlay, estimateTricks } from './strategy.js';
import type { StrategyTraits } from './strategy.js';

function c(suit: Suit | 'J', rank: string, id = `${suit}${rank}`): Card {
  return { id, suit, rank } as Card;
}

const play = (seat: number, card: Card): PlayedCard => ({ seat: seat as SeatIndex, card });

const AGGRESSIVE: StrategyTraits = { bidAggression: 1, playStyle: 'aggressive' };
const BALANCED: StrategyTraits = { bidAggression: 0, playStyle: 'balanced' };
const CAUTIOUS: StrategyTraits = { bidAggression: -1, playStyle: 'cautious' };

const noopRng = (): number => 0;

describe('analyzeHand', () => {
  it('detects voids, singletons, doubletons and jokers', () => {
    const hand = [
      c('S', 'A'),
      c('S', '2'),
      c('H', 'K'),
      c('C', '3'),
      c('C', '4'),
      c('J', 'BIG'),
      c('J', 'LITTLE'),
    ];
    const pattern = analyzeHand(hand);
    const spades = pattern.suits.find((s) => s.suit === 'S')!;
    const hearts = pattern.suits.find((s) => s.suit === 'H')!;
    const diamonds = pattern.suits.find((s) => s.suit === 'D')!;
    const clubs = pattern.suits.find((s) => s.suit === 'C')!;
    expect(pattern.jokers).toBe(2);
    expect(spades.doubleton).toBe(true);
    expect(spades.hasAce).toBe(true);
    expect(hearts.singleton).toBe(true);
    expect(hearts.hasKing).toBe(true);
    expect(diamonds.void).toBe(true);
    expect(clubs.cards).toHaveLength(2);
  });
});

describe('estimateTricks', () => {
  it('rates a long, honor-heavy trump hand above the minimum bid', () => {
    const hand = [
      c('S', 'A'),
      c('S', 'K'),
      c('S', 'Q'),
      c('S', 'J'),
      c('S', '10'),
      c('S', '9'),
      c('S', '8'),
      c('S', '7'),
      c('H', 'A'),
      c('D', '2'),
      c('D', '3'),
      c('D', '4'),
      c('C', '5'),
    ];
    expect(estimateTricks(hand, 'S')).toBeGreaterThanOrEqual(8);
    expect(estimateTricks(hand, 'S')).toBeGreaterThan(estimateTricks(hand, 'C'));
  });

  it('clamps weak hands to the minimum bid', () => {
    const hand = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) =>
      i < 6 ? c('C', String(i + 2), `c${i}`) : i < 9 ? c('D', String(i - 4), `d${i}`) : i < 12 ? c('H', String(i - 7), `h${i}`) : c('S', '2'),
    );
    expect(estimateTricks(hand, 'S')).toBe(7);
  });

  it('rewards side-suit voids when trump is long', () => {
    const withVoid = [
      c('S', 'A'),
      c('S', 'K'),
      c('S', 'Q'),
      c('S', '2'),
      c('S', '3'),
      c('S', '4'),
      c('H', 'A'),
      c('H', '2'),
      c('H', '3'),
      c('H', '4'),
      c('C', 'A'),
      c('C', '2'),
      c('C', '3'),
    ];
    const withoutVoid = [
      c('S', 'A'),
      c('S', 'K'),
      c('S', 'Q'),
      c('S', '2'),
      c('S', '3'),
      c('S', '4'),
      c('H', 'A'),
      c('H', '2'),
      c('H', '3'),
      c('H', '4'),
      c('C', 'A'),
      c('C', '2'),
      c('D', '5'),
    ];
    const withVoidEstimate = estimateTricks(withVoid, 'S');
    const withoutVoidEstimate = estimateTricks(withoutVoid, 'S');
    expect(withVoidEstimate).toBeGreaterThan(7);
    expect(withVoidEstimate).toBeGreaterThan(withoutVoidEstimate);
  });
});

describe('chooseBid', () => {
  it('returns a legal bid or null', () => {
    const hand = [
      c('S', 'A'),
      c('S', 'K'),
      c('S', 'Q'),
      c('S', 'J'),
      c('S', '10'),
      c('S', '9'),
      c('S', '8'),
      c('S', '7'),
      c('H', 'A'),
      c('D', '2'),
      c('D', '3'),
      c('D', '4'),
      c('C', '5'),
    ];
    const bid = chooseBid(hand, null, BALANCED, noopRng);
    expect(bid).not.toBeNull();
    expect(isLegalBid(null, bid!)).toBe(true);
  });

  it('never outbids an impossible current bid', () => {
    const hand = [
      c('S', 'A'),
      c('S', 'K'),
      c('S', 'Q'),
      c('S', 'J'),
      c('S', '10'),
      c('S', '9'),
      c('S', '8'),
      c('S', '7'),
      c('H', 'A'),
      c('D', '2'),
      c('D', '3'),
      c('D', '4'),
      c('C', '5'),
    ];
    const bid = chooseBid(hand, { tricks: 13, denomination: 'NT' }, AGGRESSIVE, noopRng);
    expect(bid).toBeNull();
  });
});

describe('choosePlay defensive trumping', () => {
  const trump = 'S';
  const mySeat = 2 as SeatIndex;
  // Void in clubs, holding trumps and side cards. Opponent (seat 1) leads the trick.
  const hand = [c('S', '3'), c('S', '4'), c('H', '2'), c('D', '2'), c('D', '3')];
  const trick: PlayedCard[] = [play(0, c('C', '7')), play(1, c('C', '9'))];

  it('aggressive bots ruff to win the trick', () => {
    const id = choosePlay(hand, hand, trick, trump, mySeat, AGGRESSIVE, noopRng, 1);
    expect(id).toBe('S3');
  });

  it('balanced bots ruff when the ruff is cheap', () => {
    const id = choosePlay(hand, hand, trick, trump, mySeat, BALANCED, noopRng, 1);
    expect(id).toBe('S3');
  });

  it('cautious bots preserve trumps early instead of ruffing', () => {
    const id = choosePlay(hand, hand, trick, trump, mySeat, CAUTIOUS, noopRng, 1);
    expect(id).toBe('H2');
  });

  it('cautious bots ruff late in the hand when short on trumps', () => {
    const id = choosePlay(hand, hand, trick, trump, mySeat, CAUTIOUS, noopRng, 10);
    expect(id).toBe('S3');
  });

  it('never ruff when partner is already winning', () => {
    const partnerWinning: PlayedCard[] = [play(0, c('C', 'A')), play(1, c('C', '3'))];
    const id = choosePlay(hand, hand, partnerWinning, trump, mySeat, AGGRESSIVE, noopRng, 1);
    expect(id).toBe('H2');
  });

  it('plays the lowest winning card when following suit', () => {
    const following = [c('C', 'J'), c('C', 'K'), c('C', '2')];
    const id = choosePlay(following, following, trick, trump, 2, AGGRESSIVE, noopRng, 1);
    expect(id).toBe('CJ');
  });
});
