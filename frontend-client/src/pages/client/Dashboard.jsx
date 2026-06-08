import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import { displayTotalKg, formatDateDayMonth } from '../../utils/format';
import styles from './Dashboard.module.css';

const MARKET_LOCATIONS = [
  ['Coimbatore', 'coimbatore', 'coimbatoreAvg'],
  ['Mamballi', 'mamballi', 'mamballiAvg'],
  ['Ramnagar', 'ramnagar', 'ramnagarAvg'],
  ['Dharmapuri', 'dharmapuri', 'dharmapuriAvg']
];

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [marketRate, setMarketRate] = useState(null);
  const [rateIndex, setRateIndex] = useState(0);
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

  useEffect(() => {
    if (!marketRate) return undefined;
    const id = setInterval(() => {
      setRateIndex((i) => (i + 1) % MARKET_LOCATIONS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [marketRate]);

  const [rateLabel, rateKey, rateAvgKey] = MARKET_LOCATIONS[rateIndex];

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
              <div className={styles.rateCarousel}>
                <div key={rateIndex} className={styles.rateCardSingle}>
                  <span className={styles.rateLoc}>{rateLabel}</span>
                  <span className={styles.rateVal}>₹{marketRate[rateKey] ?? '—'}</span>
                  <span className={styles.rateUnit}>
                    Avg: ₹{marketRate[rateAvgKey] ?? marketRate.minAvg ?? '—'}
                  </span>
                </div>
                <div className={styles.rateDots} aria-hidden>
                  {MARKET_LOCATIONS.map(([label], i) => (
                    <span
                      key={label}
                      className={`${styles.rateDot} ${i === rateIndex ? styles.rateDotOn : ''}`}
                    />
                  ))}
                </div>
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
                <div
                  key={b._id}
                  className={`card ${styles.batchRow}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/batch-history/${b._id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/batch-history/${b._id}`)}
                >
                  <span>
                    {formatDateDayMonth(b.date)} · {b.location} · {displayTotalKg(b)} kg
                  </span>
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
