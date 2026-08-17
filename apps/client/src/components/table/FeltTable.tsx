import { DENOM_LABEL, type SeatIndex, type TableState } from '@bidwhist/shared';
import { Seat } from './Seat';
import { PlayingCard } from '../cards/PlayingCard';

const SEAT_POSITION: Record<SeatIndex, 'top' | 'right' | 'bottom' | 'left'> = {
  0: 'top',
  1: 'right',
  2: 'bottom',
  3: 'left',
};

interface FeltTableProps {
  state: TableState;
  mySeat: SeatIndex | null;
}

export function FeltTable({ state, mySeat }: FeltTableProps) {
  const seats: SeatIndex[] = [0, 1, 2, 3];

  return (
    <div className="felt-table">
      <div className="felt-surface">
        {state.trump && (
          <div className="trump-banner">
            <span>{state.trump === 'NT' ? 'No Trump' : `${DENOM_LABEL[state.trump]} trump`}</span>
            {state.highestBid && <span className="bid-value">{state.highestBid.tricks}</span>}
            {state.declarerSeat !== null && (
              <span className="declarer-name">
                {state.players[state.declarerSeat]?.username ?? 'Declarer'}
              </span>
            )}
          </div>
        )}

        <div className="trick-area">
          {seats.map((seat) => {
            const plays = state.currentTrick.filter((p) => p.seat === seat);
            return (
              <div key={seat} className={`trick-slot trick-slot-${SEAT_POSITION[seat]}`}>
                {plays.map((p) => (
                  <PlayingCard key={p.card.id} card={p.card} small />
                ))}
              </div>
            );
          })}
        </div>

        {seats.map((seat) => {
          const player = state.players[seat];
          if (!player) {
            return (
              <div key={seat} className={`seat seat-${SEAT_POSITION[seat]} seat-empty`}>
                <span className="seat-name">Empty seat</span>
              </div>
            );
          }
          return (
            <Seat
              key={seat}
              player={player}
              isMySeat={mySeat === seat}
              isDealer={state.dealerSeat === seat}
              isActive={
                state.currentBidder === seat ||
                state.currentPlayer === seat ||
                state.currentDiscarder === seat
              }
              position={SEAT_POSITION[seat]}
            />
          );
        })}
      </div>
    </div>
  );
}
