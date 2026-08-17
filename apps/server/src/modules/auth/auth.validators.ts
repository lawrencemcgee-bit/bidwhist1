import { z } from 'zod';
import { HUMAN_AVATARS } from '@bidwhist/shared';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateAvatarSchema = z.object({
  avatarId: z.string().refine((id) => HUMAN_AVATARS.some((a) => a.id === id), 'Unknown avatar'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
