import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HistoryEntry } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';
import { BotAvatar } from '../components/avatars/BotAvatar';

export function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listHistory(100)
      .then((res) => setHistory(res.history))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load history'));
  }, []);

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Match History</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Lobby
        </button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <ul className="table-list">
        {history.map((entry) => (
          <li key={entry.id} className="history-row">
            <div className="table-info">
              <strong>{entry.tableName}</strong>
              <span>
                {new Date(entry.playedAt).toLocaleString()} · {entry.handsPlayed} hands · winner{' '}
                {entry.winnerLabel}
              </span>
              <span className="history-scores">
                {entry.scores.slice(0, 2).map((score, i) => (
                  <span key={i}>
                    {i === 0 ? 'NS' : 'EW'} {score}
                  </span>
                ))}
              </span>
              <span className="history-players">
                {entry.players.map((p) => (
                  <span key={`${entry.id}-${p.seat}`} className="history-player">
                    <BotAvatar avatarId={p.avatarId} username={p.username} size="sm" />
                    {p.username} {p.kind === 'bot' ? '(bot)' : ''}
                  </span>
                ))}
              </span>
            </div>
            <div className="table-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/replay/${entry.id}`)}
              >
                Replay
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/table/${entry.tableId}?spectate=1`)}
              >
                Spectate
              </button>
            </div>
          </li>
        ))}
        {history.length === 0 && !error && (
          <li className="table-empty">No games played yet — join a table and play!</li>
        )}
      </ul>
    </div>
  );
}
