import {
  DENOM_RANK,
  isJoker,
  rankValue,
  BID_DENOMINATIONS,
  MIN_BID,
  MAX_BID,
  SUITS,
  type Bid,
  type BidDenomination,
  type Card,
  type Rank,
  type Suit,
  type Trump,
} from '@bidwhist/shared';
import { cardValue, currentTrickWinner } from '../game/evaluator.js';
import { partnerSeat } from '../game/bidding.js';
import type { PlayedCard, SeatIndex } from '../game/types.js';

export interface StrategyTraits {
  bidAggression: number;
  playStyle: 'cautious' | 'aggressive' | 'balanced' | 'random';
}

export interface SuitPattern {
  suit: Suit;
  cards: Card[];
  honors: number;
  hasAce: boolean;
  hasKing: boolean;
  void: boolean;
  singleton: boolean;
  doubleton: boolean;
}

export interface HandPattern {
  jokers: number;
  honorTotal: number;
  suits: SuitPattern[];
  longestLength: number;
}

function honorValue(card: Card): number {
  const v = rankValue(card.rank as Rank);
  if (v >= 12) return 1;
  if (v >= 11) return 0.5;
  if (v >= 10) return 0.25;
  return 0;
}

export function analyzeHand(hand: Card[]): HandPattern {
  const buckets = new Map<Suit, Card[]>();
  let jokers = 0;
  for (const card of hand) {
    if (isJoker(card)) {
      jokers += 1;
      continue;
    }
    const suit = card.suit as Suit;
    const bucket = buckets.get(suit) ?? [];
    bucket.push(card);
    buckets.set(suit, bucket);
  }

  const suits: SuitPattern[] = SUITS.map((suit) => {
    const cards = buckets.get(suit) ?? [];
    let honors = 0;
    let hasAce = false;
    let hasKing = false;
    for (const card of cards) {
      const honor = honorValue(card);
      honors += honor;
      if (honor >= 1) hasAce = true;
      else if (honor >= 0.5) hasKing = true;
    }
    return {
      suit,
      cards,
      honors,
      hasAce,
      hasKing,
      void: cards.length === 0,
      singleton: cards.length === 1,
      doubleton: cards.length === 2,
    };
  });

  return {
    jokers,
    honorTotal: suits.reduce((sum, suit) => sum + suit.honors, 0),
    suits,
    longestLength: Math.max(...suits.map((suit) => suit.cards.length)),
  };
}

function trumpLengthBonus(count: number): number {
  if (count >= 6) return 3;
  if (count >= 5) return 2;
  if (count >= 4) return 1.2;
  if (count >= 3) return 0.6;
  return 0;
}

export function estimateTricks(hand: Card[], denomination: BidDenomination, pattern: HandPattern = analyzeHand(hand)): number {
  const isTrump = denomination !== 'NT';
  const trumpSuit = isTrump ? (denomination as Suit) : null;
  const trumpPattern = trumpSuit ? pattern.suits.find((s) => s.suit === trumpSuit)! : null;
  const trumpCount = trumpPattern?.cards.length ?? 0;

  let total = pattern.honorTotal + pattern.jokers * 1.75;

  if (trumpPattern) {
    total += trumpLengthBonus(trumpCount);
    if (trumpPattern.hasAce) total += 0.5;
    if (trumpPattern.hasKing && trumpCount >= 2) total += 0.3;
    if (trumpCount >= 2) {
      for (const suit of pattern.suits) {
        if (suit.suit === trumpSuit) continue;
        if (suit.void) total += 1.2;
        else if (suit.singleton) total += 0.6;
        else if (suit.doubleton) total += 0.3;
      }
    }
  } else {
    total += pattern.jokers * 0.5;
    for (const suit of pattern.suits) {
      if (suit.cards.length >= 5) total += (suit.cards.length - 4) * 0.4;
      if (suit.hasAce) total += 0.25;
    }
  }

  return Math.max(MIN_BID, Math.min(MAX_BID, Math.round(total)));
}

export function chooseBid(
  hand: Card[],
  highestBid: Bid | null,
  traits: StrategyTraits,
  rng: () => number,
): Bid | null {
  const pattern = analyzeHand(hand);
  const estimates = BID_DENOMINATIONS.map((denomination) => ({
    denomination,
    tricks: estimateTricks(hand, denomination, pattern),
  }));

  const jitter = traits.playStyle === 'random' ? Math.floor(rng() * 3) - 1 : 0;

  estimates.sort(
    (a, b) =>
      b.tricks + traits.bidAggression - (a.tricks + traits.bidAggression) ||
      DENOM_RANK[b.denomination] - DENOM_RANK[a.denomination],
  );

  const best = estimates[0]!;
  const tricks = Math.max(MIN_BID, Math.min(MAX_BID, best.tricks + traits.bidAggression + jitter));
  const bid: Bid = { tricks, denomination: best.denomination };

  if (isLegalBidFor(highestBid, bid)) return bid;

  if (traits.bidAggression > 0 && highestBid) {
    const push: Bid = { tricks: bid.tricks + 1, denomination: highestBid.denomination };
    if (push.tricks <= MAX_BID && isLegalBidFor(highestBid, push)) return push;
  }
  return null;
}

function isLegalBidFor(current: Bid | null, next: Bid): boolean {
  if (current === null) return next.tricks >= MIN_BID && next.tricks <= MAX_BID;
  if (next.tricks !== current.tricks) return next.tricks > current.tricks;
  return DENOM_RANK[next.denomination] > DENOM_RANK[current.denomination];
}

export function chooseDiscard(hand: Card[], trump: Trump, count: number): string[] {
  return [...hand]
    .sort((a, b) => cardValue(a, trump).value - cardValue(b, trump).value)
    .slice(0, count)
    .map((c) => c.id);
}

export function choosePlay(
  hand: Card[],
  legal: Card[],
  trickSoFar: PlayedCard[],
  trump: Trump,
  mySeat: SeatIndex,
  traits: StrategyTraits,
  rng: () => number,
  trickNumber = 1,
): string {
  if (traits.playStyle === 'random') {
    return legal[Math.floor(rng() * legal.length)]!.id;
  }

  if (trickSoFar.length === 0) {
    return chooseLead(legal, trump, traits, rng);
  }

  const partner = partnerSeat(mySeat);
  const currentWinner = currentTrickWinner(trickSoFar, trump);
  const winningCards = legal.filter((card) => {
    const trial: PlayedCard[] = [...trickSoFar, { seat: mySeat, card }];
    return currentTrickWinner(trial, trump) === mySeat;
  });

  if (currentWinner === partner) {
    return lowest(legal, trump);
  }

  if (winningCards.length > 0) {
    const lowestWin = [...winningCards].sort(
      (a, b) => cardValue(a, trump).value - cardValue(b, trump).value,
    )[0]!;
    if (isRuff(hand, trickSoFar, trump, lowestWin)) {
      if (shouldRuff(hand, trickNumber, traits, trump, lowestWin)) {
        return lowestWin.id;
      }
      return lowest(legal, trump);
    }
    return lowestWin.id;
  }

  return lowest(legal, trump);
}

function isRuff(hand: Card[], trickSoFar: PlayedCard[], trump: Trump, card: Card): boolean {
  if (trump === 'NT' || isJoker(card) || card.suit !== trump) return false;
  const lead = trickSoFar[0]!.card;
  if (isJoker(lead) || lead.suit === trump) return false;
  return hand.filter((c) => c.suit === lead.suit).length === 0;
}

function shouldRuff(
  hand: Card[],
  trickNumber: number,
  traits: StrategyTraits,
  trump: Trump,
  ruffCard: Card,
): boolean {
  const trumpCount = hand.filter((c) => !isJoker(c) && c.suit === trump).length;
  const cheap = !isJoker(ruffCard) && rankValue(ruffCard.rank as Rank) <= 8;
  const late = trickNumber >= 9;
  switch (traits.playStyle) {
    case 'aggressive':
      return true;
    case 'cautious':
      return (trumpCount >= 3 && cheap) || (trumpCount >= 2 && late) || trumpCount >= 5;
    case 'balanced':
    default:
      return cheap || late || trumpCount >= 3;
  }
}

function chooseLead(legal: Card[], trump: Trump, traits: StrategyTraits, rng: () => number): string {
  if (traits.playStyle === 'random') {
    return legal[Math.floor(rng() * legal.length)]!.id;
  }
  const nonJoker = legal.filter((c) => !isJoker(c));
  const nonTrump = nonJoker.filter((c) => trump === 'NT' || c.suit !== trump);
  const pool = nonTrump.length > 0 ? nonTrump : nonJoker.length > 0 ? nonJoker : legal;

  const bySuit = new Map<Suit, Card[]>();
  for (const card of pool) {
    if (isJoker(card)) continue;
    const suit = card.suit as Suit;
    const bucket = bySuit.get(suit) ?? [];
    bucket.push(card);
    bySuit.set(suit, bucket);
  }

  let bestSuit: Card[] = [];
  for (const bucket of bySuit.values()) {
    if (bucket.length > bestSuit.length) bestSuit = bucket;
  }
  if (bestSuit.length === 0) return lowest(legal, trump);
  return lowest(bestSuit, trump);
}

function lowest(cards: Card[], trump: Trump): string {
  return [...cards].sort((a, b) => cardValue(a, trump).value - cardValue(b, trump).value)[0]!.id;
}
