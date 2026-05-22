import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearSession, getStoredUser } from './api/client';
import { hasUpcomingBooking } from './utils/bookingGate';
import ClientRouteGuard from './components/auth/ClientRouteGuard';
import Login from './pages/client/Login';
import BookingGate from './pages/client/BookingGate';
import Dashboard from './pages/client/Dashboard';
import Booking from './pages/client/Booking';
import BatchHistory from './pages/client/BatchHistory';
import BatchDetail from './pages/client/BatchDetail';
import Tracker from './pages/client/Tracker';
import Settings from './pages/client/Settings';
import DriverRentalPortal from './pages/driver/DriverRentalPortal';
import DriverRentalUser from './pages/driver/DriverRentalUser';
import PublicRegister from './pages/register/PublicRegister';
import './styles/tracknow.css';

function HomeRedirect({ user }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    hasUpcomingBooking()
      .then((has) => setTarget(has ? '/dashboard' : '/booking-gate'))
      .catch(() => setTarget('/dashboard'));
  }, []);

  if (!target) return <div className="app-loading">Loading…</div>;
  return <Navigate to={target} replace />;
}

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
        <Route path="/driver/rental/:token" element={<DriverRentalPortal />} />
        <Route path="/driver/rental/:token/user/:userId" element={<DriverRentalUser />} />
        <Route path="/register/:token" element={<PublicRegister />} />
        <Route
          path="/login"
          element={
            user ? (
              <HomeRedirect user={user} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        {user ? (
          <>
            <Route path="/booking-gate" element={<BookingGate user={user} />} />
            <Route element={<ClientRouteGuard />}>
              <Route path="/" element={<HomeRedirect user={user} />} />
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/batch-history" element={<BatchHistory />} />
              <Route path="/batch-history/:batchId" element={<BatchDetail />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route
                path="/settings"
                element={<Settings user={user} onLogout={handleLogout} />}
              />
            </Route>
            <Route path="*" element={<HomeRedirect user={user} />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
