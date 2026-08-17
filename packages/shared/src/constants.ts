export const TABLE_SIZE = 4;
export const HAND_SIZE = 13;
export const KITTY_SIZE = 2;
export const DECK_SIZE = 54;
export const TRICKS_PER_HAND = 13;
export const SCORING_BASE = 6;
export const MIN_BID = 7;
export const MAX_BID = 13;
export const WINNING_SCORE = 7;

export const BID_DENOMINATIONS = ['C', 'D', 'H', 'S', 'NT'] as const;
export type BidDenomination = (typeof BID_DENOMINATIONS)[number];

export const DENOM_LABEL: Record<BidDenomination, string> = {
  C: 'Clubs',
  D: 'Diamonds',
  H: 'Hearts',
  S: 'Spades',
  NT: 'No Trump',
};

export const DENOM_RANK: Record<BidDenomination, number> = {
  C: 0,
  D: 1,
  H: 2,
  S: 3,
  NT: 4,
};

export const GAME_PHASES = [
  'WAITING',
  'DEALING',
  'BIDDING',
  'DISCARDING',
  'PLAYING',
  'HAND_OVER',
  'GAME_OVER',
] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

export const TABLE_STATUSES = ['WAITING', 'PLAYING', 'FINISHED'] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export interface Bid {
  tricks: number;
  denomination: BidDenomination;
}

export function isLegalBid(current: Bid | null, next: Bid): boolean {
  if (next.tricks < MIN_BID || next.tricks > MAX_BID) return false;
  if (current === null) return true;
  if (next.tricks !== current.tricks) return next.tricks > current.tricks;
  return DENOM_RANK[next.denomination] > DENOM_RANK[current.denomination];
}
