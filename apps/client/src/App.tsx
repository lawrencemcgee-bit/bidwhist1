import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { SoundProvider } from './components/sound/SoundProvider';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LobbyPage } from './pages/LobbyPage';
import { TablePage } from './pages/TablePage';
import { HistoryPage } from './pages/HistoryPage';
import { LadderPage } from './pages/LadderPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ReplayPage } from './pages/ReplayPage';

export function App() {
  const initialized = useAuth((s) => s.initialized);
  const init = useAuth((s) => s.init);
  const token = useAuth((s) => s.token);

  useEffect(() => {
    void init();
  }, [init]);

  if (!initialized) {
    return <div className="boot-screen">Loading…</div>;
  }

  return (
    <SoundProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={token ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={token ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route path="/" element={token ? <LobbyPage /> : <Navigate to="/login" replace />} />
          <Route
            path="/history"
            element={token ? <HistoryPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ladder"
            element={token ? <LadderPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/achievements"
            element={token ? <AchievementsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/replay/:gameId"
            element={token ? <ReplayPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/table/:tableId"
            element={token ? <TablePage /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SoundProvider>
  );
}
