import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProfileDto } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../store/auth';
import { BotAvatar } from '../components/avatars/BotAvatar';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const me = useAuth((s) => s.user);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api
      .getProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load profile'));
  }, [userId]);

  if (error) {
    return (
      <div className="lobby-page">
        <header className="lobby-header">
          <h1>Profile</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Lobby
          </button>
        </header>
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="boot-screen">Loading…</div>;
  }

  const history = profile.ratingHistory;
  const maxRating = Math.max(1200, ...history.map((p) => p.rating));
  const minRating = Math.min(1200, ...history.map((p) => p.rating));
  const range = Math.max(1, maxRating - minRating);

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Player Profile</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/ladder')}>
          Ladder
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Lobby
        </button>
      </header>

      <div className="profile-card">
        <div className="profile-header">
          <BotAvatar avatarId={profile.avatarId ?? 'human-blue'} username={profile.username} size="lg" />
          <div className="profile-identity">
            <h2>{profile.username}</h2>
            <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
            {profile.userId === me?.id && <span className="profile-you">this is you</span>}
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <strong>{profile.rating}</strong>
            <span>Rating</span>
          </div>
          <div className="profile-stat">
            <strong>{profile.stats.gamesPlayed}</strong>
            <span>Games</span>
          </div>
          <div className="profile-stat">
            <strong>{profile.stats.wins}</strong>
            <span>Wins</span>
          </div>
          <div className="profile-stat">
            <strong>{profile.stats.losses}</strong>
            <span>Losses</span>
          </div>
          <div className="profile-stat">
            <strong>{profile.stats.winRate}%</strong>
            <span>Win rate</span>
          </div>
        </div>

        <div className="profile-section">
          <h3>Rating history</h3>
          {history.length === 0 ? (
            <p className="table-empty">No rated games yet — play a game to start your rating history.</p>
          ) : (
            <div className="rating-chart">
              {history.map((point, index) => {
                const heightPct = ((point.rating - minRating) / range) * 100;
                return (
                  <div
                    key={index}
                    className="rating-bar"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                    title={`${point.rating} on ${new Date(point.at).toLocaleDateString()}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>Recent games</h3>
          {profile.recentGames.length === 0 ? (
            <p className="table-empty">No games played yet.</p>
          ) : (
            <ul className="table-list">
              {profile.recentGames.map((entry) => (
                <li key={entry.id} className="history-row">
                  <div className="table-info">
                    <strong>{entry.tableName}</strong>
                    <span>
                      {new Date(entry.playedAt).toLocaleString()} · {entry.handsPlayed} hands · winner{' '}
                      {entry.winnerLabel}
                    </span>
                    <span className="history-scores">
                      NS {entry.scores[0]! + entry.scores[2]!} · EW {entry.scores[1]! + entry.scores[3]!}
                    </span>
                  </div>
                  <div className="table-actions">
                    <button className="btn btn-secondary" onClick={() => navigate(`/replay/${entry.id}`)}>
                      Replay
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
