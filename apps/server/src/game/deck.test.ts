import { describe, expect, it } from 'vitest';
import { DECK_SIZE, HAND_SIZE, KITTY_SIZE } from '@bidwhist/shared';
import { deal, mulberry32, shuffle } from './deck.js';
import { buildDeck } from '@bidwhist/shared';

describe('deck', () => {
  it('builds a 54 card deck of unique ids', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((c) => c.id)).size).toBe(DECK_SIZE);
  });

  it('deals 4 hands of 13 and a kitty of 2 with no duplicates', () => {
    const { hands, kitty } = deal(mulberry32(42));
    for (const hand of hands) {
      expect(hand).toHaveLength(HAND_SIZE);
    }
    expect(kitty).toHaveLength(KITTY_SIZE);
    const all = [...hands.flat(), ...kitty];
    expect(new Set(all.map((c) => c.id)).size).toBe(DECK_SIZE);
  });

  it('is deterministic for a fixed seed', () => {
    const a = deal(mulberry32(7));
    const b = deal(mulberry32(7));
    expect(a.hands.map((h) => h.map((c) => c.id))).toEqual(b.hands.map((h) => h.map((c) => c.id)));
  });

  it('shuffles into different orders for different seeds', () => {
    const a = shuffle(buildDeck(), mulberry32(1));
    const b = shuffle(buildDeck(), mulberry32(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });
});
