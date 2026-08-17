import type { BotPersonality } from './avatars.js';

export interface PersonalityTraits {
  id: BotPersonality;
  chatFrequency: number;
  bidAggression: number;
  playStyle: 'cautious' | 'aggressive' | 'balanced' | 'random';
  delayFactor: number;
}

export const PERSONALITY_TRAITS: Record<BotPersonality, PersonalityTraits> = {
  Witty: { id: 'Witty', chatFrequency: 0.45, bidAggression: 0, playStyle: 'balanced', delayFactor: 1 },
  Aggressive: { id: 'Aggressive', chatFrequency: 0.3, bidAggression: 1, playStyle: 'aggressive', delayFactor: 0.8 },
  Cautious: { id: 'Cautious', chatFrequency: 0.15, bidAggression: -1, playStyle: 'cautious', delayFactor: 1.2 },
  Playful: { id: 'Playful', chatFrequency: 0.5, bidAggression: 0, playStyle: 'balanced', delayFactor: 1 },
  Analytical: { id: 'Analytical', chatFrequency: 0.2, bidAggression: 0, playStyle: 'balanced', delayFactor: 1.3 },
  Quiet: { id: 'Quiet', chatFrequency: 0.05, bidAggression: 0, playStyle: 'cautious', delayFactor: 1.1 },
  Competitive: { id: 'Competitive', chatFrequency: 0.35, bidAggression: 1, playStyle: 'aggressive', delayFactor: 0.9 },
  Unpredictable: { id: 'Unpredictable', chatFrequency: 0.4, bidAggression: 0, playStyle: 'random', delayFactor: 0.7 },
};
