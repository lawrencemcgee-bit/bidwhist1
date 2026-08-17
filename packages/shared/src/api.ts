export interface UserDto {
  id: string;
  email: string;
  username: string;
  avatarId: string | null;
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

export interface ApiError {
  error: string;
  code?: string;
}
