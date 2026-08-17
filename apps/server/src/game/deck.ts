import { buildDeck, HAND_SIZE, KITTY_SIZE, type Card } from '@bidwhist/shared';
import type { SeatIndex } from './types.js';

export interface Rng {
  next(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = tmp!;
  }
  return arr;
}

export interface Deal {
  hands: [Card[], Card[], Card[], Card[]];
  kitty: Card[];
}

export function deal(rng: Rng): Deal {
  const deck = shuffle(buildDeck(), rng);
  const hands = [] as unknown as [Card[], Card[], Card[], Card[]];
  for (let seat = 0; seat < 4; seat++) {
    const start = seat * HAND_SIZE;
    hands[seat as SeatIndex] = deck.slice(start, start + HAND_SIZE);
  }
  const kitty = deck.slice(4 * HAND_SIZE, 4 * HAND_SIZE + KITTY_SIZE);
  return { hands, kitty };
}
