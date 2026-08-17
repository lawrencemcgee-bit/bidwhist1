export const BOT_PERSONALITIES = [
  'Witty',
  'Aggressive',
  'Cautious',
  'Playful',
  'Analytical',
  'Quiet',
  'Competitive',
  'Unpredictable',
] as const;

export type BotPersonality = (typeof BOT_PERSONALITIES)[number];

export interface BotProfile {
  id: string;
  name: string;
  initials: string;
  color: string;
  secondaryColor: string;
  personality: BotPersonality;
  seed: number;
}

export const BOT_AVATARS: BotProfile[] = [
  {
    id: 'mia-witty',
    name: 'Mia',
    initials: 'M',
    color: '#e11d48',
    secondaryColor: '#fda4af',
    personality: 'Witty',
    seed: 1001,
  },
  {
    id: 'ray-analytical',
    name: 'Ray',
    initials: 'R',
    color: '#2563eb',
    secondaryColor: '#93c5fd',
    personality: 'Analytical',
    seed: 1002,
  },
  {
    id: 'lina-cautious',
    name: 'Lina',
    initials: 'L',
    color: '#059669',
    secondaryColor: '#6ee7b7',
    personality: 'Cautious',
    seed: 1003,
  },
  {
    id: 'omar-unpredictable',
    name: 'Omar',
    initials: 'O',
    color: '#7c3aed',
    secondaryColor: '#c4b5fd',
    personality: 'Unpredictable',
    seed: 1004,
  },
  {
    id: 'priya-competitive',
    name: 'Priya',
    initials: 'P',
    color: '#d97706',
    secondaryColor: '#fcd34d',
    personality: 'Competitive',
    seed: 1005,
  },
  {
    id: 'jack-playful',
    name: 'Jack',
    initials: 'J',
    color: '#0891b2',
    secondaryColor: '#67e8f9',
    personality: 'Playful',
    seed: 1006,
  },
  {
    id: 'rosa-aggressive',
    name: 'Rosa',
    initials: 'R',
    color: '#be123c',
    secondaryColor: '#fda4af',
    personality: 'Aggressive',
    seed: 1007,
  },
  {
    id: 'elias-quiet',
    name: 'Elias',
    initials: 'E',
    color: '#475569',
    secondaryColor: '#cbd5e1',
    personality: 'Quiet',
    seed: 1008,
  },
  {
    id: 'nadia-witty',
    name: 'Nadia',
    initials: 'N',
    color: '#ea580c',
    secondaryColor: '#fdba74',
    personality: 'Witty',
    seed: 1009,
  },
  {
    id: 'teo-analytical',
    name: 'Teo',
    initials: 'T',
    color: '#4f46e5',
    secondaryColor: '#a5b4fc',
    personality: 'Analytical',
    seed: 1010,
  },
];

export const HUMAN_AVATARS = [
  { id: 'human-blue', color: '#1d4ed8', secondaryColor: '#93c5fd' },
  { id: 'human-green', color: '#047857', secondaryColor: '#6ee7b7' },
  { id: 'human-amber', color: '#b45309', secondaryColor: '#fcd34d' },
  { id: 'human-violet', color: '#6d28d9', secondaryColor: '#c4b5fd' },
  { id: 'human-rose', color: '#be185d', secondaryColor: '#f9a8d4' },
  { id: 'human-cyan', color: '#0e7490', secondaryColor: '#67e8f9' },
  { id: 'human-slate', color: '#334155', secondaryColor: '#cbd5e1' },
  { id: 'human-red', color: '#b91c1c', secondaryColor: '#fca5a5' },
] as const;

export function isHumanAvatar(id: string | null | undefined): id is string {
  return typeof id === 'string' && HUMAN_AVATARS.some((a) => a.id === id);
}

export function getBotProfile(id: string): BotProfile {
  const profile = BOT_AVATARS.find((p) => p.id === id);
  if (!profile) {
    throw new Error(`Unknown bot profile: ${id}`);
  }
  return profile;
}
