import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyTracker } from '../../api/tracker.api';
import './Tracker.css';

const Tracker = () => {
  const { user } = useAuth();
  const [trackerData, setTrackerData] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTracker = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyTracker();
      if (response.isEnabled === false) {
        setIsEnabled(false);
        setTrackerData(null);
      } else {
        setIsEnabled(true);
        setTrackerData(response);
      }
    } catch (err) {
      setError(err.message);
      setIsEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracker();
  }, [loadTracker]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTracker();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadTracker]);

  const getStatusBadge = () => {
    if (!trackerData || !trackerData.status) return null;

    const isMoving = trackerData.status === 'Moving';

    return (
      <div className={isMoving ? 'moving-badge' : 'idle-badge'}>
        <div className="status-dot"></div>
        {trackerData.status}
      </div>
    );
  };

  return (
    <div className="tracker-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A2E1A', margin: 0 }}>Live Tracker</h1>
        {isEnabled && getStatusBadge()}
      </div>

      {/* Loading State */}
      {loading ? (
        <div>
          <div style={{ height: '260px', background: '#E0EBE0', borderRadius: '24px', marginBottom: '16px', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}></div>
          <div style={{ height: '80px', background: '#E0EBE0', borderRadius: '16px', marginBottom: '12px', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}></div>
          <div style={{ height: '40px', background: '#E0EBE0', borderRadius: '12px', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}></div>
        </div>
      ) : !isEnabled ? (
        <div className="tracker-disabled-wrap">
          <div className="tracker-disabled-icon">🛑</div>
          <h2 className="tracker-disabled-title">Tracker Not Enabled</h2>
          <p className="tracker-disabled-msg">
            Your location tracker is currently disabled. Please contact your admin to enable it.
          </p>
          <div className="tracker-contact-note">
            Contact admin to enable tracking for your account.
          </div>
        </div>
      ) : (
        <div>
          {/* Map Section */}
          <div className="tracker-map-container">
            {trackerData?.latitude && trackerData?.longitude ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <p style={{ fontSize: '13px', color: '#9CA99F', margin: '0 0 12px' }}>Last known position</p>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A2E1A', margin: 0, fontFamily: 'monospace' }}>
                  {trackerData.latitude.toFixed(6)}, {trackerData.longitude.toFixed(6)}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA99F', marginTop: '16px', textAlign: 'center', lineHeight: '1.4' }}>
                  Map integration ready. Connect Google Maps or Mapbox with your API key.
                </p>
              </div>
            ) : (
              <div className="tracker-map-placeholder">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '12px', opacity: 0.3 }}>
                  <path d="M24 4a11 11 0 0 1 11 11c0 7-11 22-11 22S13 22 13 15a11 11 0 0 1 11-11zm0 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="currentColor" />
                </svg>
                <p style={{ fontSize: '14px', color: '#9CA99F', margin: '0 0 4px' }}>
                  Waiting for GPS signal
                </p>
                <p style={{ fontSize: '12px', color: '#9CA99F', margin: 0 }}>
                  Tracker active - position updating...
                </p>
              </div>
            )}
          </div>

          {/* Status Card */}
          <div className="tracker-status-card">
            <div className="tracker-status-row">
              <div style={{ background: 'rgba(27, 107, 58, 0.1)', color: '#1B6B3A', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                ID: {user?.email?.split('@')[0].toUpperCase()}
              </div>
              {getStatusBadge()}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6 }}>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: '12px', color: '#9CA99F', margin: 0 }}>
                Last updated: {trackerData?.lastUpdated ? new Date(trackerData.lastUpdated).toLocaleTimeString('en-IN') : 'Never'}
              </p>
            </div>
          </div>

          {/* Admin Note */}
          <div style={{ background: '#F0F7F2', border: '1px solid #D1E9DC', borderRadius: '12px', padding: '12px 16px', marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#1A2E1A', margin: 0, fontWeight: '600' }}>
              ℹ️ Admin can view your real-time location and batch history.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracker;
