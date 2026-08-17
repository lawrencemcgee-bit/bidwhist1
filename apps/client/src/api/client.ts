import type {
  AchievementDto,
  AuthResponse,
  HistoryEntry,
  LadderEntry,
  ProfileDto,
  ReplayResponse,
  TableSummary,
  UserDto,
} from '@bidwhist/shared';
import { API_BASE } from '../config.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    throw new ApiError(res.status, body?.error ?? res.statusText, body?.code);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const api = {
  register: (data: RegisterInput) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginInput) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: UserDto }>('/api/auth/me'),
  updateAvatar: (avatarId: string) =>
    request<{ user: UserDto }>('/api/auth/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatarId }),
    }),
  listTables: () => request<{ tables: TableSummary[] }>('/api/tables'),
  createTable: (data: { name: string }) =>
    request<{ table: TableSummary }>('/api/tables', { method: 'POST', body: JSON.stringify(data) }),
  getTable: (id: string) => request<{ table: TableSummary }>(`/api/tables/${id}`),
  listHistory: (limit = 50) =>
    request<{ history: HistoryEntry[] }>(`/api/history?limit=${limit}`),
  getReplay: (gameId: string) => request<ReplayResponse>(`/api/history/${gameId}/replay`),
  listLadder: () => request<{ ladder: LadderEntry[] }>('/api/ladder'),
  myRank: () => request<{ rank: number }>('/api/ladder/me'),
  listAchievements: () => request<{ achievements: AchievementDto[] }>('/api/achievements'),
  getProfile: (userId: string) => request<ProfileDto>(`/api/users/${userId}`),
};
