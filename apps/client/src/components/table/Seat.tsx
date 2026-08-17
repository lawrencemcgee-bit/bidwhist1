import type { PlayerSnapshot, SeatIndex } from '@bidwhist/shared';
import { BotAvatar } from '../avatars/BotAvatar';

interface SeatProps {
  player: PlayerSnapshot;
  isMySeat: boolean;
  isDealer: boolean;
  isActive: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
}

export function Seat({ player, isMySeat, isDealer, isActive, position }: SeatProps) {
  return (
    <div className={`seat seat-${position} ${isActive ? 'seat-active' : ''} ${isMySeat ? 'seat-me' : ''}`}>
      <BotAvatar avatarId={player.avatarId} username={player.username} size="md" />
      <div className="seat-meta">
        <span className="seat-name">
          {player.username}
          {isMySeat ? ' (you)' : ''}
        </span>
        <span className="seat-stats">
          score {player.score} · {player.handSize} cards
          {isDealer && <span className="seat-role">dealer</span>}
        </span>
      </div>
      {player.away && <span className="seat-away">away</span>}
      {isDealer && <span className="seat-dealer">D</span>}
      {player.kind === 'bot' && <span className="seat-bot-tag">bot</span>}
    </div>
  );
}

export type { SeatIndex };
