import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasUpcomingBooking } from '../../utils/bookingGate';

const GATE_PATH = '/booking-gate';

export default function ClientRouteGuard() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsGate, setNeedsGate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    hasUpcomingBooking()
      .then((has) => {
        if (!cancelled) setNeedsGate(!has);
      })
      .catch(() => {
        if (!cancelled) setNeedsGate(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (checking) {
    return <div className="app-loading">Loading…</div>;
  }

  if (needsGate && location.pathname !== GATE_PATH) {
    return <Navigate to={GATE_PATH} replace />;
  }

  if (!needsGate && location.pathname === GATE_PATH) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
