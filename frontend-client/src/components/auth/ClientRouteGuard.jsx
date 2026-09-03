import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasUpcomingBooking } from '../../utils/bookingGate';
import { getStoredUser } from '../../api/client';

const GATE_PATH = '/booking-gate';

export default function ClientRouteGuard() {
  const location = useLocation();
  const user = getStoredUser();
  const uid = user?._id || user?.id || 'anon';
  
  // Fast initial check from user-scoped local storage so UI doesn't flicker
  const savedDate = localStorage.getItem(`last_booking_date_${uid}`);
  const today = new Date().toISOString().split('T')[0];
  const hasLocalBooking = localStorage.getItem(`has_active_booking_${uid}`) === 'true' || (savedDate && savedDate >= today);

  const [checking, setChecking] = useState(!hasLocalBooking);
  const [needsGate, setNeedsGate] = useState(!hasLocalBooking);

  useEffect(() => {
    let cancelled = false;
    
    // Background verify with server
    hasUpcomingBooking()
      .then((has) => {
        if (!cancelled) {
          setNeedsGate(!has);
        }
      })
      .catch(() => {
        if (!cancelled && !hasLocalBooking) {
          setNeedsGate(false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
