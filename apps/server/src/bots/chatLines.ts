import type { BotPersonality } from './avatars.js';

export type ChatContext =
  | 'greeting'
  | 'onBid'
  | 'onBidPass'
  | 'onWinTrick'
  | 'onLoseTrick'
  | 'onMake'
  | 'onFail'
  | 'onLead';

const LINES: Record<BotPersonality, Partial<Record<ChatContext, string[]>>> = {
  Witty: {
    greeting: [
      'Shuffle the deck, I am in a mood for a story.',
      'Glad I wore my lucky sleeves tonight.',
    ],
    onBid: [
      'I hope you did not need that trick.',
      'That bid was bold... let us see if it was wise.',
      'Bold. Almost as bold as my last dessert choice.',
    ],
    onBidPass: ['Passing. The cards are not poets today.'],
    onWinTrick: ['Right on schedule.', 'Like collecting rent on time.'],
    onLoseTrick: ['That one is yours. For now.', 'Enjoy it. They are rare.'],
    onMake: ['As scripted. Applause optional.'],
    onFail: ['The cards had other literary plans.'],
    onLead: ['Leading with confidence, or with leftovers.'],
  },
  Aggressive: {
    greeting: ['I did not come here to fold quietly.'],
    onBid: ['I am taking this one.', 'This table is mine tonight.'],
    onBidPass: ['Let you sniff the win.'],
    onWinTrick: ['That is how it is done.', 'Take notes.'],
    onLoseTrick: ['A borrowed trick. You will repay it.'],
    onMake: ['Said it. Did it.'],
    onFail: ['Rare misstep. Noted for next round.'],
    onLead: ['Here comes the storm.'],
  },
  Cautious: {
    greeting: ['Careful cards first, fireworks later.'],
    onBid: ['I will bid just enough.'],
    onBidPass: ['Prudence is a weapon.'],
    onWinTrick: ['A quiet trick, safely banked.'],
    onLoseTrick: ['Well played. Watch the next one.'],
    onMake: ['Steady does it.'],
    onFail: ['We will be steadier next time.'],
    onLead: ['A safe little lead.'],
  },
  Playful: {
    greeting: ['Deal me in, I brought snacks.'],
    onBid: ['Wheee, the trumps are out to play!'],
    onBidPass: ['No fun this round.'],
    onWinTrick: ['Ha! Collected!'],
    onLoseTrick: ['Fine, you can have that one.'],
    onMake: ['Party at our table!'],
    onFail: ['The party moved next door.'],
    onLead: ['First toy on the table.'],
  },
  Analytical: {
    greeting: ['Probability favors the prepared.'],
    onBid: ['Estimating nine tricks.'],
    onBidPass: ['The math says pass.'],
    onWinTrick: ['Consistent with the model.'],
    onLoseTrick: ['A deviation from the projection.'],
    onMake: ['Model confirmed.'],
    onFail: ['Recalibrating the model.'],
    onLead: ['Optimizing the lead.'],
  },
  Quiet: {
    greeting: ['...'],
    onBid: ['Seven.'],
    onBidPass: ['Pass.'],
    onWinTrick: ['Mm.'],
    onLoseTrick: ['Mm.'],
    onMake: ['Good.'],
    onFail: ['Hm.'],
    onLead: ['Your move.'],
  },
  Competitive: {
    greeting: ['Points are the only currency here.'],
    onBid: ['Outbid? We will see.'],
    onBidPass: ['Saving the bullets.'],
    onWinTrick: ['One point closer.'],
    onLoseTrick: ['A round lost, not the war.'],
    onMake: ['Victory tastes like trumps.'],
    onFail: ['The rematch is coming.'],
    onLead: ['Set the pace, or chase it.'],
  },
  Unpredictable: {
    greeting: ['Let us flip a coin to start, yes?'],
    onBid: ['Maybe I bid. Maybe I do not.'],
    onBidPass: ['Surprise: pass.'],
    onWinTrick: ['Even I did not see that coming.'],
    onLoseTrick: ['Wild. Just wild.'],
    onMake: ['Chaos and order, in harmony.'],
    onFail: ['Predictable failure is still failure.'],
    onLead: ['Behold, a random card!'],
  },
};

export function chatLine(personality: BotPersonality, context: ChatContext): string | null {
  const bucket = LINES[personality][context];
  if (!bucket || bucket.length === 0) return null;
  return bucket[Math.floor(Math.random() * bucket.length)]!;
}
