export const SUITS = ['C', 'D', 'H', 'S'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

export const JOKER_RANKS = ['BIG', 'LITTLE'] as const;
export type JokerRank = (typeof JOKER_RANKS)[number];

export const JOKER_SUIT = 'J' as const;

export interface Card {
  id: string;
  suit: Suit | typeof JOKER_SUIT;
  rank: Rank | JokerRank;
}

export function isJoker(card: Card): boolean {
  return card.suit === JOKER_SUIT;
}

const RANK_ORDER: Record<Rank, number> = {
  '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6,
  '9': 7, '10': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12,
};

export function rankValue(rank: Rank): number {
  return RANK_ORDER[rank];
}

export const SUIT_LABEL: Record<Suit, string> = {
  C: '\u2663', D: '\u2666', H: '\u2665', S: '\u2660',
};

export function cardLabel(card: Card): string {
  if (isJoker(card)) {
    return card.rank === 'BIG' ? 'Big Joker' : 'Little Joker';
  }
  return `${card.rank}${SUIT_LABEL[card.suit as Suit]}`;
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}${rank}`, suit, rank });
    }
  }
  deck.push({ id: 'JBIG', suit: JOKER_SUIT, rank: 'BIG' });
  deck.push({ id: 'JLIT', suit: JOKER_SUIT, rank: 'LITTLE' });
  return deck;
}
