import { describe, expect, it } from 'vitest';
import type { Card } from '@bidwhist/shared';
import { cardValue, currentTrickWinner, legalPlays, resolveTrick } from './evaluator.js';
import type { PlayedCard, SeatIndex } from './types.js';

const card = (id: string): Card => {
  const match = id.match(/^(JBIG|JLIT)$/);
  if (match) {
    return { id, suit: 'J', rank: match[1] === 'JBIG' ? 'BIG' : 'LITTLE' };
  }
  return { id, suit: id[0] as 'C' | 'D' | 'H' | 'S', rank: id.slice(1) as Card['rank'] };
};

const play = (seat: SeatIndex, id: string): PlayedCard => ({ seat, card: card(id) });

describe('evaluator', () => {
  it('a trump beats an off-suit card', () => {
    const winner = resolveTrick([play(0, 'H2'), play(1, 'S2'), play(2, 'H7'), play(3, 'D2')], 'H');
    expect(winner).toBe(2);
  });

  it('highest trump wins over lower trumps', () => {
    const winner = resolveTrick([play(0, 'S2'), play(1, 'S5'), play(2, 'S10'), play(3, 'SA')], 'S');
    expect(winner).toBe(3);
  });

  it('highest card of the lead suit wins when no trump is played', () => {
    const winner = resolveTrick([play(0, 'C9'), play(1, 'C7'), play(2, 'D2'), play(3, 'CA')], 'S');
    expect(winner).toBe(3);
  });

  it('jokers are the highest trumps when a suit is trump', () => {
    const big = cardValue(card('JBIG'), 'H');
    const little = cardValue(card('JLIT'), 'H');
    const aceTrump = cardValue(card('HA'), 'H');
    expect(big.value).toBeGreaterThan(little.value);
    expect(little.value).toBeGreaterThan(aceTrump.value);
  });

  it('jokers are the two highest cards in no-trump', () => {
    const big = cardValue(card('JBIG'), 'NT');
    const little = cardValue(card('JLIT'), 'NT');
    const ace = cardValue(card('SA'), 'NT');
    expect(big.value).toBeGreaterThan(little.value);
    expect(little.value).toBeGreaterThan(ace.value);
  });

  it('forces follow suit when a matching card exists', () => {
    const hand = [card('S2'), card('S7'), card('HK')];
    expect(legalPlays(hand, 'S').map((c) => c.id)).toEqual(['S2', 'S7']);
  });

  it('allows any card when the player cannot follow suit', () => {
    const hand = [card('D2'), card('HK')];
    expect(legalPlays(hand, 'S').map((c) => c.id)).toEqual(['D2', 'HK']);
  });

  it('allows any card after a joker lead in no-trump', () => {
    const hand = [card('D2'), card('HK')];
    expect(legalPlays(hand, 'J')).toHaveLength(2);
  });

  it('currentTrickWinner resolves partial tricks consistently', () => {
    const partial = [play(0, 'H5'), play(1, 'H9')];
    expect(currentTrickWinner(partial, 'H')).toBe(1);
    const extended = [...partial, play(2, 'H3')];
    expect(currentTrickWinner(extended, 'H')).toBe(1);
  });
});
