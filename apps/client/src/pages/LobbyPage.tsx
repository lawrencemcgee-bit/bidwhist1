import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TableSummary } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../store/auth';
import { AvatarPicker } from '../components/avatars/AvatarPicker';

export function LobbyPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const updateAvatar = useAuth((s) => s.updateAvatar);
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listTables();
      setTables(res.tables);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load tables');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTable = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { table } = await api.createTable({ name: name.trim() || 'New Table' });
      navigate(`/table/${table.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create table');
    }
  };

  const changeAvatar = (avatarId: string) => {
    setError(null);
    updateAvatar(avatarId).catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Could not update avatar'),
    );
  };

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Bid Whist — Lobby</h1>
        <div className="lobby-user">
          <AvatarPicker value={user?.avatarId} onChange={changeAvatar} />
          <span>{user?.username}</span>
          <span className="lobby-rating">rating {user?.rating ?? 1200}</span>
          <button className="btn btn-ghost" onClick={() => navigate('/ladder')}>
            Ladder
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/achievements')}>
            Achievements
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/history')}>
            History
          </button>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <form className="create-table" onSubmit={createTable}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Table name"
          maxLength={40}
        />
        <button type="submit" className="btn btn-primary">Create table</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <ul className="table-list">
        {tables.map((table) => (
          <li key={table.id} className="table-row">
            <div className="table-info">
              <strong>{table.name}</strong>
              <span>
                {table.playerCount}/{table.maxPlayers} seated · {table.botCount} bots · {table.status}
              </span>
            </div>
            <div className="table-actions">
              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/table/${table.id}?spectate=1`)}
              >
                Spectate
              </button>
              <button
                className="btn btn-secondary"
                disabled={table.playerCount >= table.maxPlayers}
                onClick={() => navigate(`/table/${table.id}`)}
              >
                Join
              </button>
            </div>
          </li>
        ))}
        {tables.length === 0 && <li className="table-empty">No tables yet — create one above.</li>}
      </ul>
    </div>
  );
}
