import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AchievementDto } from '@bidwhist/shared';
import { api, ApiError } from '../api/client';

export function AchievementsPage() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAchievements()
      .then((res) => setAchievements(res.achievements))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load achievements'));
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1>Achievements</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Lobby
        </button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <p className="achievement-summary">
        Unlocked {unlockedCount} of {achievements.length}
      </p>

      <ul className="table-list achievement-list">
        {achievements.map((achievement) => {
          const unlocked = achievement.unlockedAt !== null;
          return (
            <li key={achievement.id} className={`history-row ${unlocked ? 'achievement-unlocked' : ''}`}>
              <div className="table-info">
                <span className="achievement-icon">{unlocked ? '★' : '☆'}</span>
                <div className="achievement-text">
                  <strong>{achievement.name}</strong>
                  <span>{achievement.description}</span>
                </div>
                <span className="achievement-date">
                  {unlocked ? new Date(achievement.unlockedAt!).toLocaleDateString() : 'Locked'}
                </span>
              </div>
            </li>
          );
        })}
        {achievements.length === 0 && !error && (
          <li className="table-empty">No achievements defined.</li>
        )}
      </ul>
    </div>
  );
}
