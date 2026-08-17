import { BOT_AVATARS, type BotPersonality, type BotProfile } from '@bidwhist/shared';

export type { BotProfile, BotPersonality };
export { BOT_AVATARS };

export function getBotProfile(id: string): BotProfile {
  const profile = BOT_AVATARS.find((p) => p.id === id);
  if (!profile) {
    throw new Error(`Unknown bot profile: ${id}`);
  }
  return profile;
}

export function pickBotProfile(excludeIds: string[], rng: () => number): BotProfile {
  const available = BOT_AVATARS.filter((p) => !excludeIds.includes(p.id));
  const pool = available.length > 0 ? available : BOT_AVATARS;
  const index = Math.floor(rng() * pool.length);
  return pool[index]!;
}
