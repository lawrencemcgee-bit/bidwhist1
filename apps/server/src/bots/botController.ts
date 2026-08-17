import type { Trump } from '@bidwhist/shared';
import { config } from '../config.js';
import type { GameEngine } from '../game/engine.js';
import type { EngineEvent } from '../game/events.js';
import { leadSuitOf, legalPlays } from '../game/evaluator.js';
import { partnerSeat } from '../game/bidding.js';
import type { SeatIndex } from '../game/types.js';
import { mulberry32 } from '../game/deck.js';
import type { BotProfile } from './avatars.js';
import { PERSONALITY_TRAITS } from './personalities.js';
import { chatLine, type ChatContext } from './chatLines.js';
import { chooseBid, chooseDiscard, choosePlay } from './strategy.js';

export interface BotHost {
  engineOrThrow(): GameEngine;
  emitBotChat(seat: SeatIndex, profile: BotProfile, text: string): void;
}

export class BotController {
  private rng: () => number;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  get seat(): SeatIndex {
    return this.seatNumber;
  }

  constructor(
    private host: BotHost,
    private profile: BotProfile,
    private seatNumber: SeatIndex,
  ) {
    this.rng = mulberry32(profile.seed).next;
  }

  onEngineEvent(event: EngineEvent): void {
    switch (event.type) {
      case 'bid:turn':
      case 'discard:turn':
      case 'play:turn':
        if (event.seat === this.seatNumber) this.scheduleAct();
        break;
      case 'trick:won':
        if (event.winnerSeat === this.seatNumber) this.maybeChat('onWinTrick');
        break;
      case 'hand:ended': {
        const result = event.result;
        const declarer = result.declarerSeat;
        const involved = this.seatNumber === declarer || this.seatNumber === partnerSeat(declarer);
        if (involved) this.maybeChat(result.made ? 'onMake' : 'onFail');
        break;
      }
      default:
        break;
    }
  }

  greet(): void {
    this.maybeChat('greeting');
  }

  scheduleAct(): void {
    this.schedule();
  }

  destroy(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  private schedule(): void {
    const [min, max] = [config.botMinDelayMs, config.botMaxDelayMs];
    const delay = min + Math.floor(this.rng() * (max - min));
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      this.act();
    }, delay);
  }

  private act(): void {
    const engine = this.host.engineOrThrow();
    const state = engine.getState();
    const hand = state.seats[this.seatNumber]!.hand;

    if (state.phase === 'BIDDING') {
      const bid = chooseBid(hand, state.highestBid, PERSONALITY_TRAITS[this.profile.personality], this.rng);
      engine.bid(this.seatNumber, bid);
      this.maybeChat(bid ? 'onBid' : 'onBidPass');
      return;
    }

    if (state.phase === 'DISCARDING') {
      const ids = chooseDiscard(hand, state.trump as Trump, 2);
      engine.discard(this.seatNumber, ids);
      return;
    }

    if (state.phase === 'PLAYING') {
      const lead = state.currentTrick.length > 0 ? leadSuitOf(state.currentTrick[0]!.card) : null;
      const legal = legalPlays(hand, lead);
      const cardId = choosePlay(
        hand,
        legal,
        state.currentTrick,
        state.trump as Trump,
        this.seatNumber,
        PERSONALITY_TRAITS[this.profile.personality],
        this.rng,
      );
      engine.playCard(this.seatNumber, cardId);
      return;
    }
  }

  private maybeChat(context: ChatContext): void {
    const traits = PERSONALITY_TRAITS[this.profile.personality];
    if (this.rng() > traits.chatFrequency) return;
    const line = chatLine(this.profile.personality, context);
    if (line) {
      this.host.emitBotChat(this.seatNumber, this.profile, line);
    }
  }
}
