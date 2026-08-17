import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LadderEntry } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../store/auth';
import { BotAvatar } from '../components/avatars/BotAvatar';

export function LadderPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [ladder, setLadder] = useState<LadderEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listLadder()
      .then((res) => setLadder(res.ladder))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load ladder'));
  }, []);

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Ranked Ladder</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Lobby
        </button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <ul className="table-list ladder-list">
        {ladder.map((entry) => (
          <li key={entry.userId} className={`history-row ${entry.userId === user?.id ? 'is-me' : ''}`}>
            <div className="table-info">
              <span className="ladder-rank">#{entry.rank}</span>
              <span className="history-player">
                <BotAvatar avatarId={entry.avatarId ?? 'human-blue'} username={entry.username} size="sm" />
                {entry.username} {entry.userId === user?.id ? '(you)' : ''}
              </span>
              <span>
                rating {entry.rating} · {entry.gamesPlayed} games · {entry.wins} wins
              </span>
            </div>
          </li>
        ))}
        {ladder.length === 0 && !error && (
          <li className="table-empty">No ranked players yet — play a game to join the ladder!</li>
        )}
      </ul>
    </div>
  );
}
