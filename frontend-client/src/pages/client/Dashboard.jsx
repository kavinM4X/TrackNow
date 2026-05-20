import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import ReminderModal from '../../components/common/ReminderModal';
import api, { clearSession } from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';
import styles from './Dashboard.module.css';

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [marketRate, setMarketRate] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);
  const [stats, setStats] = useState({ totalBatches: 0, totalKg: 0 });
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rateRes, upcomingRes, recentRes, statsRes] = await Promise.all([
        api.get('/market-rates/latest'),
        api.get('/bookings/upcoming'),
        api.get('/batches/recent'),
        api.get('/batches/stats')
      ]);
      setMarketRate(rateRes.data);
      setUpcoming(upcomingRes.data);
      setRecentBatches(recentRes.data || []);
      setStats(statsRes.data || { totalBatches: 0, totalKg: 0 });

      const booking = upcomingRes.data;
      if (
        booking &&
        localStorage.getItem(`reminder_ack_${booking.date}`) !== 'true'
      ) {
        setShowReminder(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      api.get('/market-rates/latest').then((r) => setMarketRate(r.data)).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const locations = [
    ['Coimbatore', 'coimbatore', 'coimbatoreAvg'],
    ['Mamballi', 'mamballi', 'mamballiAvg'],
    ['Ramnagar', 'ramnagar', 'ramnagarAvg'],
    ['Dharmapuri', 'dharmapuri', 'dharmapuriAvg']
  ];
  const hasUpcomingReminder = Boolean(upcoming);
  const reminderPending =
    Boolean(upcoming) &&
    localStorage.getItem(`reminder_ack_${upcoming.date}`) !== 'true';

  const logout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    clearSession();
    onLogout?.();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome, ${user?.name?.split(' ')[0] || 'Farmer'}`}
      headerRight={
        <button
          type="button"
          onClick={() => hasUpcomingReminder && setShowReminder(true)}
          aria-label="Open notifications"
          disabled={!hasUpcomingReminder}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: hasUpcomingReminder ? 'pointer' : 'default',
            opacity: hasUpcomingReminder ? 1 : 0.5,
            fontSize: 18
          }}
        >
          <span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
            🔔
            {reminderPending && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -1,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '1px solid #fff'
                }}
              />
            )}
          </span>
        </button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {marketRate && (
            <>
              <p className="section-title">Live Market Rate</p>
              <div className={styles.rateGrid}>
                {locations.map(([label, key, avgKey]) => (
                  <div key={key} className={styles.rateCard}>
                    <span className={styles.rateLoc}>{label}</span>
                    <span className={styles.rateVal}>₹{marketRate[key] ?? '—'}</span>
                    <span className={styles.rateUnit}>
                      Avg: ₹{marketRate[avgKey] ?? marketRate.minAvg ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={`card ${styles.upcoming}`}>
            {upcoming ? (
              <>
                <div>
                  <div className={styles.upLabel}>Upcoming Batch</div>
                  <div className={styles.upMain}>
                    {formatDateDayMonth(upcoming.date)} · {upcoming.location}
                  </div>
                  <div className={styles.upSub}>{upcoming.quantityKg} kg</div>
                </div>
                <Badge status={upcoming.status} />
              </>
            ) : (
              <p className="empty-text" style={{ margin: 0 }}>
                No upcoming batch scheduled
              </p>
            )}
          </div>

          {recentBatches.length > 0 && (
            <>
              <p className="section-title">Last batches</p>
              {recentBatches.map((b) => (
                <div key={b._id} className={`card ${styles.batchRow}`}>
                  <div>
                    <strong>{formatDateDayMonth(b.date)}</strong> · {b.location} · {b.quantityKg} kg
                  </div>
                </div>
              ))}
            </>
          )}

          <div className={styles.statsRow}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div className={styles.statNum}>{stats.totalBatches}</div>
              <div className={styles.statLbl}>Batches</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div className={styles.statNum}>{stats.totalKg}kg</div>
              <div className={styles.statLbl}>Total Silk</div>
            </div>
          </div>

          <button type="button" className="btn-danger" onClick={logout} style={{ marginTop: 8 }}>
            Logout
          </button>
        </>
      )}

      {showReminder && upcoming && (
        <ReminderModal
          booking={upcoming}
          onAcknowledge={() => setShowReminder(false)}
        />
      )}
    </AppShell>
  );
}
