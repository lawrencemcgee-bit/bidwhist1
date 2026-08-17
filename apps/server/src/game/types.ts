import type { Card } from '@bidwhist/shared';
import type { Bid, GamePhase, Trump } from '@bidwhist/shared';

export type { Bid, GamePhase, Trump };
export type SeatIndex = 0 | 1 | 2 | 3;
export type PlayerKind = 'human' | 'bot';

export interface SeatPlayer {
  seat: SeatIndex;
  playerId: string;
  username: string;
  kind: PlayerKind;
  avatarId: string;
  botProfileId?: string | null;
}

export interface PlayedCard {
  seat: SeatIndex;
  card: Card;
}

export interface EngineSeatState {
  player: SeatPlayer;
  hand: Card[];
  tricksTaken: number;
}

export interface EngineState {
  phase: GamePhase;
  handNumber: number;
  dealerSeat: SeatIndex | null;
  seats: EngineSeatState[];
  kitty: Card[];
  pendingPassCards: Card[];
  currentBidder: SeatIndex | null;
  currentDiscarder: SeatIndex | null;
  biddingHistory: Array<{ seat: SeatIndex; bid: Bid | null }>;
  highestBid: Bid | null;
  lastBidder: SeatIndex | null;
  declarerSeat: SeatIndex | null;
  trump: Trump | null;
  currentTrickLeader: SeatIndex | null;
  currentPlayer: SeatIndex | null;
  currentTrick: PlayedCard[];
  trickNumber: number;
  scores: [number, number, number, number];
  finished: boolean;
}
