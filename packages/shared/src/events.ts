import type { Card } from './cards.js';
import type { Bid } from './constants.js';
import type { HandEndedResult, PlayedCard, SeatIndex, TableState, Trump } from './game.js';

export const CLIENT_EVENTS = {
  tableJoin: 'table:join',
  tableLeave: 'table:leave',
  tableSpectate: 'table:spectate',
  botAdd: 'table:bot:add',
  botRemove: 'table:bot:remove',
  gameStart: 'game:start',
  bidAction: 'bid:action',
  discardCards: 'discard:cards',
  playCard: 'play:card',
  chatSend: 'chat:send',
} as const;

export const SERVER_EVENTS = {
  tableState: 'table:state',
  tablePrivate: 'table:private',
  playerJoined: 'table:player-joined',
  playerLeft: 'table:player-left',
  playerAway: 'player:away',
  playerBack: 'player:back',
  spectatorCount: 'table:spectators',
  gameStarted: 'game:started',
  gameDeal: 'game:deal',
  bidStarted: 'bid:started',
  bidTurn: 'bid:turn',
  bidMade: 'bid:made',
  bidPassed: 'bid:passed',
  bidEnded: 'bid:ended',
  discardTurn: 'discard:turn',
  discardMade: 'discard:made',
  playTurn: 'play:turn',
  cardPlayed: 'card:played',
  trickWon: 'trick:won',
  handEnded: 'hand:ended',
  gameEnded: 'game:ended',
  chatMessage: 'chat:message',
  actionError: 'action:error',
} as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];

export interface TableJoinPayload {
  tableId: string;
  preferredSeat?: SeatIndex;
}

export interface TableSpectatePayload {
  tableId: string;
}

export interface BotAddPayload {
  tableId: string;
}

export interface BotRemovePayload {
  tableId: string;
  seat: SeatIndex;
}

export interface GameStartPayload {
  tableId: string;
}

export type BidActionPayload =
  | { tableId: string; type: 'pass' }
  | { tableId: string; type: 'bid'; bid: Bid };

export interface DiscardPayload {
  tableId: string;
  cardIds: string[];
}

export interface PlayCardPayload {
  tableId: string;
  cardId: string;
}

export interface ChatSendPayload {
  tableId: string;
  text: string;
}

export interface PrivateHandPayload {
  hand: Card[];
}

export interface PlayerJoinedPayload {
  player: {
    seat: SeatIndex | null;
    username: string;
    kind: 'human' | 'bot';
    avatarId: string;
    botProfileId?: string | null;
  };
}

export interface PlayerLeftPayload {
  seat: SeatIndex;
}

export interface PlayerAwayPayload {
  seat: SeatIndex;
  botProfileId: string | null;
}

export interface PlayerBackPayload {
  seat: SeatIndex;
}

export interface SpectatorCountPayload {
  count: number;
}

export interface DealPayload {
  handNumber: number;
  dealerSeat: SeatIndex;
  kittyCount: number;
}

export interface BidTurnPayload {
  seat: SeatIndex;
}

export interface BidMadePayload {
  seat: SeatIndex;
  bid: Bid;
}

export interface BidPassedPayload {
  seat: SeatIndex;
}

export interface BidEndedPayload {
  declarerSeat: SeatIndex;
  bid: Bid;
  trump: Trump;
}

export interface DiscardTurnPayload {
  seat: SeatIndex;
  kittyReveal: boolean;
}

export interface DiscardMadePayload {
  seat: SeatIndex;
  cardIds: string[];
  passedToSeat?: SeatIndex;
}

export interface PlayTurnPayload {
  seat: SeatIndex;
}

export interface CardPlayedPayload extends PlayedCard {
  handSize: number;
}

export interface TrickWonPayload {
  winnerSeat: SeatIndex;
  trickNumber: number;
  cards: PlayedCard[];
}

export interface HandEndedPayload extends HandEndedResult {}

export interface GameEndedPayload {
  winnerPartnership: 0 | 1;
  scores: [number, number, number, number];
}

export interface ChatMessagePayload {
  seat: SeatIndex | null;
  username: string;
  avatarId: string;
  text: string;
  at: number;
}

export interface ActionErrorPayload {
  code: string;
  message: string;
}

export interface ClientEventMap {
  [CLIENT_EVENTS.tableJoin]: TableJoinPayload;
  [CLIENT_EVENTS.tableLeave]: TableJoinPayload;
  [CLIENT_EVENTS.tableSpectate]: TableSpectatePayload;
  [CLIENT_EVENTS.botAdd]: BotAddPayload;
  [CLIENT_EVENTS.botRemove]: BotRemovePayload;
  [CLIENT_EVENTS.gameStart]: GameStartPayload;
  [CLIENT_EVENTS.bidAction]: BidActionPayload;
  [CLIENT_EVENTS.discardCards]: DiscardPayload;
  [CLIENT_EVENTS.playCard]: PlayCardPayload;
  [CLIENT_EVENTS.chatSend]: ChatSendPayload;
}

export interface ServerEventMap {
  [SERVER_EVENTS.tableState]: TableState;
  [SERVER_EVENTS.tablePrivate]: PrivateHandPayload;
  [SERVER_EVENTS.playerJoined]: PlayerJoinedPayload;
  [SERVER_EVENTS.playerLeft]: PlayerLeftPayload;
  [SERVER_EVENTS.playerAway]: PlayerAwayPayload;
  [SERVER_EVENTS.playerBack]: PlayerBackPayload;
  [SERVER_EVENTS.spectatorCount]: SpectatorCountPayload;
  [SERVER_EVENTS.gameStarted]: { tableId: string };
  [SERVER_EVENTS.gameDeal]: DealPayload;
  [SERVER_EVENTS.bidStarted]: BidTurnPayload;
  [SERVER_EVENTS.bidTurn]: BidTurnPayload;
  [SERVER_EVENTS.bidMade]: BidMadePayload;
  [SERVER_EVENTS.bidPassed]: BidPassedPayload;
  [SERVER_EVENTS.bidEnded]: BidEndedPayload;
  [SERVER_EVENTS.discardTurn]: DiscardTurnPayload;
  [SERVER_EVENTS.discardMade]: DiscardMadePayload;
  [SERVER_EVENTS.playTurn]: PlayTurnPayload;
  [SERVER_EVENTS.cardPlayed]: CardPlayedPayload;
  [SERVER_EVENTS.trickWon]: TrickWonPayload;
  [SERVER_EVENTS.handEnded]: HandEndedPayload;
  [SERVER_EVENTS.gameEnded]: GameEndedPayload;
  [SERVER_EVENTS.chatMessage]: ChatMessagePayload;
  [SERVER_EVENTS.actionError]: ActionErrorPayload;
}
