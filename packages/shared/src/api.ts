import type { ReplayEvent } from './game.js';

export interface UserDto {
  id: string;
  email: string;
  username: string;
  avatarId: string | null;
  gamesPlayed: number;
  wins: number;
  rating: number;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface TableSummary {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  maxPlayers: number;
  ownerId: string | null;
  playerCount: number;
  botCount: number;
  createdAt: string;
}

export interface HistoryPlayer {
  seat: number;
  username: string;
  kind: 'human' | 'bot';
  avatarId: string;
}

export interface HistoryEntry {
  id: string;
  tableId: string;
  tableName: string;
  playedAt: string;
  handsPlayed: number;
  winnerPartnership: 0 | 1;
  winnerLabel: string;
  scores: number[];
  players: HistoryPlayer[];
}

export interface AchievementDto {
  id: string;
  name: string;
  description: string;
  unlockedAt: string | null;
}

export interface LadderEntry {
  rank: number;
  userId: string;
  username: string;
  avatarId: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
}

export interface ReplayResponse {
  gameId: string;
  tableName: string;
  playedAt: string;
  players: HistoryPlayer[];
  replay: ReplayEvent[];
}

export interface ApiError {
  error: string;
  code?: string;
}
