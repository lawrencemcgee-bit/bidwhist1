import type { Card } from './cards.js';
import type { Bid, GamePhase, TableStatus } from './constants.js';

export type SeatIndex = 0 | 1 | 2 | 3;
export type Trump = 'C' | 'D' | 'H' | 'S' | 'NT';
export type PlayerKind = 'human' | 'bot';

export interface PlayerSnapshot {
  seat: SeatIndex | null;
  userId: string | null;
  username: string;
  kind: PlayerKind;
  avatarId: string;
  botProfileId?: string | null;
  connected: boolean;
  away: boolean;
  score: number;
  handSize: number;
}

export interface PlayedCard {
  seat: SeatIndex;
  card: Card;
}

export interface BiddingEntry {
  seat: SeatIndex;
  bid: Bid | null;
}

export interface TableState {
  tableId: string;
  name: string;
  ownerId: string | null;
  status: TableStatus;
  phase: GamePhase;
  spectators: number;
  players: (PlayerSnapshot | null)[];
  dealerSeat: SeatIndex | null;
  handNumber: number;
  trickNumber: number;
  currentBidder: SeatIndex | null;
  currentDiscarder: SeatIndex | null;
  currentPlayer: SeatIndex | null;
  currentTrick: PlayedCard[];
  biddingHistory: BiddingEntry[];
  highestBid: Bid | null;
  declarerSeat: SeatIndex | null;
  trump: Trump | null;
  kittyCount: number;
  lastTrickWinner: SeatIndex | null;
  finished: boolean;
}

export interface HandEndedResult {
  declarerSeat: SeatIndex;
  bid: Bid;
  trump: Trump;
  tricksPerSeat: [number, number, number, number];
  made: boolean;
  pointsPerSeat: [number, number, number, number];
  scores: [number, number, number, number];
  winnerPartnership: 0 | 1 | null;
}

export type ReplayEvent =
  | { type: 'deal'; handNumber: number; dealerSeat: SeatIndex; hands: Card[][]; kitty: Card[] }
  | { type: 'bid:made'; seat: SeatIndex; bid: Bid }
  | { type: 'bid:passed'; seat: SeatIndex }
  | { type: 'bid:ended'; declarerSeat: SeatIndex; bid: Bid; trump: Trump }
  | { type: 'discard:made'; seat: SeatIndex; cardIds: string[]; passedToSeat: SeatIndex | null }
  | { type: 'card:played'; seat: SeatIndex; card: Card }
  | { type: 'trick:won'; winnerSeat: SeatIndex; trickNumber: number; cards: PlayedCard[] }
  | { type: 'hand:ended'; result: HandEndedResult };
