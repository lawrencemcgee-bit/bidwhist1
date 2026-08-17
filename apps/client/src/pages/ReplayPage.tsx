import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Card, ReplayEvent, ReplayResponse, SeatIndex } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';
import { PlayingCard } from '../components/cards/PlayingCard';
import { BotAvatar } from '../components/avatars/BotAvatar';

interface BidChip {
  seat: SeatIndex;
  bid: string;
}

interface Step {
  handNumber: number;
  dealerSeat: SeatIndex | null;
  bids: BidChip[];
  declarerSeat: SeatIndex | null;
  bidLabel: string | null;
  trickNumber: number;
  trick: Array<{ seat: SeatIndex; card: Card }>;
  scores: number[];
}

function bidLabel(tricks: number, denomination: string): string {
  return `${tricks}${denomination}`;
}

function buildSteps(replay: ReplayEvent[]): Step[] {
  const steps: Step[] = [];
  let current: Step = {
    handNumber: 0,
    dealerSeat: null,
    bids: [],
    declarerSeat: null,
    bidLabel: null,
    trickNumber: 0,
    trick: [],
    scores: [0, 0, 0, 0],
  };

  for (const event of replay) {
    switch (event.type) {
      case 'deal': {
        current = {
          handNumber: event.handNumber,
          dealerSeat: event.dealerSeat,
          bids: [],
          declarerSeat: null,
          bidLabel: null,
          trickNumber: 0,
          trick: [],
          scores: current.scores,
        };
        steps.push(current);
        break;
      }
      case 'bid:made':
        current = {
          ...current,
          bids: [...current.bids, { seat: event.seat, bid: bidLabel(event.bid.tricks, event.bid.denomination) }],
        };
        steps.push(current);
        break;
      case 'bid:passed':
        current = { ...current, bids: [...current.bids, { seat: event.seat, bid: 'pass' }] };
        steps.push(current);
        break;
      case 'bid:ended':
        current = {
          ...current,
          declarerSeat: event.declarerSeat,
          bidLabel: bidLabel(event.bid.tricks, event.bid.denomination),
        };
        steps.push(current);
        break;
      case 'card:played':
        current = {
          ...current,
          trick: [...current.trick, { seat: event.seat, card: event.card }],
        };
        steps.push(current);
        break;
      case 'trick:won':
        current = { ...current, trick: [], trickNumber: current.trickNumber + 1 };
        steps.push(current);
        break;
      case 'hand:ended':
        current = { ...current, trick: [], scores: [...event.result.scores] };
        steps.push(current);
        break;
      default:
        break;
    }
  }
  return steps;
}

export function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [replay, setReplay] = useState<ReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);

  useEffect(() => {
    if (!gameId) return;
    api
      .getReplay(gameId)
      .then((res) => setReplay(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load replay'));
  }, [gameId]);

  const steps = useMemo(() => (replay ? buildSteps(replay.replay) : []), [replay]);

  const step = steps[Math.min(index, steps.length - 1)];

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, steps.length - 1)));
    },
    [steps.length],
  );

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => {
        if (prev >= steps.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, steps.length]);

  if (error) {
    return (
      <div className="lobby-page">
        <header className="lobby-header">
          <h1>Replay</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/history')}>
            History
          </button>
        </header>
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (!replay) {
    return <div className="boot-screen">Loading…</div>;
  }

  const seatName = (seat: SeatIndex): string => {
    const player = replay.players.find((p) => p.seat === seat);
    return player?.username ?? `Seat ${seat + 1}`;
  };

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Replay — {replay.tableName}</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/history')}>
          History
        </button>
      </header>

      <div className="replay-controls">
        <button className="btn btn-secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>
          Prev
        </button>
        <button className="btn btn-primary" onClick={() => setPlaying((p) => !p)} disabled={steps.length === 0}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => goTo(index + 1)}
          disabled={index >= steps.length - 1}
        >
          Next
        </button>
        <select
          className="replay-speed"
          value={speed}
          onChange={(e) => setSpeed(Number.parseInt(e.target.value, 10))}
          aria-label="Playback speed"
        >
          <option value={1400}>Slow</option>
          <option value={900}>Normal</option>
          <option value={450}>Fast</option>
        </select>
        <span className="replay-progress">
          Step {index + 1} / {steps.length}
        </span>
      </div>

      {step && (
        <div className="replay-board">
          <div className="replay-stats">
            <span>Hand {step.handNumber || '—'}</span>
            <span>Dealer {step.dealerSeat !== null ? seatName(step.dealerSeat) : '—'}</span>
            <span>Declarer {step.declarerSeat !== null ? seatName(step.declarerSeat) : '—'}</span>
            <span>Bid {step.bidLabel ?? '—'}</span>
            <span>Trick {step.trickNumber || '—'}</span>
            <span className="replay-scores">
              NS {step.scores[0]! + step.scores[2]!} · EW {step.scores[1]! + step.scores[3]!}
            </span>
          </div>

          {step.bids.length > 0 && (
            <div className="bid-history replay-bids">
              {step.bids.map((b, i) => (
                <span
                  key={i}
                  className={`bid-entry ${b.bid === 'pass' ? 'bid-pass' : 'bid-raise'}`}
                >
                  {b.bid === 'pass' ? `${seatName(b.seat)} passes` : `${seatName(b.seat)} bids ${b.bid}`}
                </span>
              ))}
            </div>
          )}

          <div className="replay-seats">
            {[0, 1, 2, 3].map((seat) => {
              const played = step.trick.find((t) => t.seat === seat);
              return (
                <div key={seat} className={`replay-seat ${seat === step.declarerSeat ? 'is-declarer' : ''}`}>
                  <div className="replay-seat-label">
                    <BotAvatar
                      avatarId={replay.players.find((p) => p.seat === seat)?.avatarId ?? 'human-blue'}
                      username={seatName(seat as SeatIndex)}
                      size="sm"
                    />
                    <span>{seatName(seat as SeatIndex)}</span>
                  </div>
                  {played ? (
                    <PlayingCard card={played.card} small />
                  ) : (
                    <span className="replay-empty-card">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
