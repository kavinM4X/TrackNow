import { useCallback, useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';
import styles from './Dashboard.module.css';

export default function Dashboard({ user }) {
  const [marketRate, setMarketRate] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);
  const [stats, setStats] = useState({ totalBatches: 0, totalKg: 0 });
  const [loading, setLoading] = useState(true);

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
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const locations = [
    ['Coimbatore', 'coimbatore', 'coimbatoreAvg'],
    ['Mamballi', 'mamballi', 'mamballiAvg'],
    ['Ramnagar', 'ramnagar', 'ramnagarAvg'],
    ['Dharmapuri', 'dharmapuri', 'dharmapuriAvg']
  ];
  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome, ${user?.name?.split(' ')[0] || 'Farmer'}`}
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

          {upcoming && (
            <div className={`card ${styles.upcoming}`}>
              <div>
                <div className={styles.upLabel}>Next batch</div>
                <div className={styles.upMain}>
                  {formatDateDayMonth(upcoming.date)} · {upcoming.location}
                </div>
                <div className={styles.upSub}>{upcoming.quantityKg} kg</div>
              </div>
              <Badge status={upcoming.status} />
            </div>
          )}

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
        </>
      )}

    </AppShell>
  );
}
