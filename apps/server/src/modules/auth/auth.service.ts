import type { AuthResponse, UserDto } from '@bidwhist/shared';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../middleware/error.js';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import type { LoginInput, RegisterInput } from './auth.validators.js';

function toUserDto(row: { id: string; email: string; username: string; avatarId: string | null }): UserDto {
  return { id: row.id, email: row.email, username: row.username, avatarId: row.avatarId };
}

function toAuthResponse(row: { id: string; email: string; username: string; avatarId: string | null }): AuthResponse {
  return {
    token: signToken({ sub: row.id, email: row.email, username: row.username }),
    user: toUserDto(row),
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, 'USER_EXISTS', 'Email or username already in use');
  }

  const password = await hashPassword(input.password);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: input.email, username: input.username, password, avatarId: 'human-blue' },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'USER_EXISTS', 'Email or username already in use');
    }
    throw err;
  }

  return toAuthResponse(user);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new HttpError(401, 'BAD_CREDENTIALS', 'Invalid email or password');
  }
  const ok = await verifyPassword(input.password, user.password);
  if (!ok) {
    throw new HttpError(401, 'BAD_CREDENTIALS', 'Invalid email or password');
  }
  return toAuthResponse(user);
}

export async function getUserById(id: string): Promise<UserDto | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, avatarId: true },
  });
  return user ? toUserDto(user) : null;
}

export async function updateAvatar(id: string, avatarId: string): Promise<UserDto | null> {
  const user = await prisma.user.update({
    where: { id },
    data: { avatarId },
    select: { id: true, email: true, username: true, avatarId: true },
  });
  return toUserDto(user);
}
