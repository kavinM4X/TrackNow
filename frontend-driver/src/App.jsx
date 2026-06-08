import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api, { getStoredUser, clearSession, setSession, getToken } from './api/client';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExpenseTrips from './pages/ExpenseTrips';
import ExpenseEntry from './pages/ExpenseEntry';
import SilkEntry from './pages/SilkEntry';
import Parties from './pages/Parties';
import Profile from './pages/Profile';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || !['driver', 'staff'].includes(stored?.role)) {
      clearSession();
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data?.user;
        if (['driver', 'staff'].includes(u?.role)) {
          setSession(token, u);
          setUser(u);
        } else {
          clearSession();
        }
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (_t, u) => setUser(u);
  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (loading) {
    return <div className="spinner" style={{ marginTop: '40vh' }} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />}
        />
        {user ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/expense" element={<ExpenseTrips />} />
            <Route path="/expense/:vehicleId" element={<ExpenseEntry />} />
            <Route path="/silk" element={<SilkEntry />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
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
