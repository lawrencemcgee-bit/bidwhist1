import { isJoker, rankValue, type Card, type Rank, type Suit } from '@bidwhist/shared';
import type { PlayedCard, SeatIndex, Trump } from './types.js';

export interface CardValue {
  suitKey: string;
  value: number;
}

export function cardValue(card: Card, trump: Trump): CardValue {
  if (isJoker(card)) {
    const base = card.rank === 'BIG' ? 130 : 120;
    if (trump === 'NT') return { suitKey: 'J', value: base };
    return { suitKey: trump, value: base };
  }
  const suitKey = card.suit as Suit;
  let value = rankValue(card.rank as Rank);
  if (trump !== 'NT' && card.suit === trump) {
    value += 100;
  }
  return { suitKey, value };
}

export function leadSuitOf(card: Card): Suit | 'J' {
  return isJoker(card) ? 'J' : (card.suit as Suit);
}

export function legalPlays(hand: Card[], leadSuit: Suit | 'J' | null): Card[] {
  if (leadSuit === null || leadSuit === 'J') return hand;
  const matching = hand.filter((c) => c.suit === leadSuit);
  return matching.length > 0 ? matching : hand;
}

export function currentTrickWinner(plays: PlayedCard[], trump: Trump): SeatIndex {
  if (plays.length === 0) {
    throw new Error('Cannot resolve an empty trick');
  }
  let winner = plays[0]!;
  for (const play of plays.slice(1)) {
    const winnerValue = cardValue(winner.card, trump);
    const challengerValue = cardValue(play.card, trump);
    const sameSuit = winnerValue.suitKey === challengerValue.suitKey;
    const beatsLead = trump !== 'NT' && challengerValue.suitKey === trump && winnerValue.suitKey !== trump;
    if ((sameSuit && challengerValue.value > winnerValue.value) || beatsLead) {
      winner = play;
    }
  }
  return winner.seat;
}

export function resolveTrick(plays: PlayedCard[], trump: Trump): SeatIndex {
  if (plays.length !== 4) {
    throw new Error(`Trick must have exactly 4 plays, got ${plays.length}`);
  }
  return currentTrickWinner(plays, trump);
}
