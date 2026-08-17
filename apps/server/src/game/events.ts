import type { Card } from '@bidwhist/shared';
import type { Bid, HandEndedResult, Trump } from '@bidwhist/shared';
import type { PlayedCard, SeatIndex } from './types.js';

export type EngineEvent =
  | { type: 'deal'; handNumber: number; dealerSeat: SeatIndex; kittyCount: number }
  | { type: 'bid:turn'; seat: SeatIndex }
  | { type: 'bid:made'; seat: SeatIndex; bid: Bid }
  | { type: 'bid:passed'; seat: SeatIndex }
  | { type: 'bid:ended'; declarerSeat: SeatIndex; bid: Bid; trump: Trump }
  | { type: 'discard:turn'; seat: SeatIndex; kittyReveal: boolean; kitty: Card[] }
  | { type: 'discard:made'; seat: SeatIndex; cardIds: string[]; passedToSeat: SeatIndex | null }
  | { type: 'play:turn'; seat: SeatIndex }
  | { type: 'card:played'; played: PlayedCard; handSize: number }
  | { type: 'trick:won'; winnerSeat: SeatIndex; trickNumber: number; cards: PlayedCard[] }
  | { type: 'hand:ended'; result: HandEndedResult }
  | { type: 'game:ended'; winnerPartnership: 0 | 1; scores: [number, number, number, number] };

export type EngineEventType = EngineEvent['type'];

export type EngineListener = (event: EngineEvent) => void;
