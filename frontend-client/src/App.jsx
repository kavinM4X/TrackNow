import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearSession, getStoredUser } from './api/client';
import Login from './pages/client/Login';
import Dashboard from './pages/client/Dashboard';
import Booking from './pages/client/Booking';
import BatchHistory from './pages/client/BatchHistory';
import BatchDetail from './pages/client/BatchDetail';
import Tracker from './pages/client/Tracker';
import Settings from './pages/client/Settings';
import './styles/tracknow.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const handleLogin = (_token, userData) => setUser(userData);
  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        {user ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/batch-history" element={<BatchHistory />} />
            <Route path="/batch-history/:batchId" element={<BatchDetail />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route
              path="/settings"
              element={<Settings user={user} onLogout={handleLogout} />}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
