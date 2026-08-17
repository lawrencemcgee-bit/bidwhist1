import { DENOM_RANK, isJoker, rankValue, BID_DENOMINATIONS, MIN_BID, MAX_BID } from '@bidwhist/shared';
import type { Bid, BidDenomination, Card, Suit, Trump } from '@bidwhist/shared';
import { cardValue, currentTrickWinner } from '../game/evaluator.js';
import { partnerSeat } from '../game/bidding.js';
import type { PlayedCard, SeatIndex } from '../game/types.js';

export interface StrategyTraits {
  bidAggression: number;
  playStyle: 'cautious' | 'aggressive' | 'balanced' | 'random';
}

function cardStrength(card: Card): number {
  if (isJoker(card)) return card.rank === 'BIG' ? 2 : 1.75;
  const v = rankValue(card.rank as 'A' | 'K' | 'Q');
  if (v >= 12) return 1;
  if (v >= 11) return 0.5;
  if (v >= 10) return 0.25;
  return 0;
}

export function estimateTricks(hand: Card[], denomination: BidDenomination): number {
  let total = 0;
  for (const card of hand) {
    total += cardStrength(card);
  }
  if (denomination !== 'NT') {
    const trumpCount = hand.filter((c) => c.suit === denomination).length;
    if (trumpCount >= 6) total += 2;
    else if (trumpCount >= 5) total += 1;
  }
  return Math.max(MIN_BID, Math.min(MAX_BID, Math.round(total)));
}

export function chooseBid(
  hand: Card[],
  highestBid: Bid | null,
  traits: StrategyTraits,
  rng: () => number,
): Bid | null {
  const estimates = BID_DENOMINATIONS.map((denomination) => ({
    denomination,
    tricks: estimateTricks(hand, denomination),
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
): string {
  if (traits.playStyle === 'random') {
    return legal[Math.floor(rng() * legal.length)]!.id;
  }

  if (trickSoFar.length === 0) {
    return chooseLead(legal, trump, traits, rng);
  }

  const partner = partnerSeat(mySeat);
  const currentWinner = currentTrickWinner(trickSoFar, trump);
  const canWin = legal.some((card) => {
    const trial: PlayedCard[] = [...trickSoFar, { seat: mySeat, card }];
    return currentTrickWinner(trial, trump) === mySeat;
  });

  if (currentWinner === partner) {
    return lowest(legal, trump);
  }

  if (canWin) {
    const winningCards = legal
      .filter((card) => {
        const trial: PlayedCard[] = [...trickSoFar, { seat: mySeat, card }];
        return currentTrickWinner(trial, trump) === mySeat;
      })
      .sort((a, b) => cardValue(a, trump).value - cardValue(b, trump).value);
    return winningCards[0]!.id;
  }

  if (traits.playStyle === 'aggressive' && trump !== 'NT') {
    const trumps = legal.filter((c) => c.suit === trump);
    if (trumps.length > 0 && !trickSoFar.some((p) => p.card.suit === trump)) {
      return lowest(trumps, trump);
    }
  }

  return lowest(legal, trump);
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
