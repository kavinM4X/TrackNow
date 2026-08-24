import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';
import rateStyles from './Dashboard.module.css';

const MARKET_LOCATIONS = [
  ['Coimbatore', 'coimbatore', 'coimbatoreAvg', 'coimbatoreMin'],
  ['Mamballi', 'mamballi', 'mamballiAvg', 'mamballiMin'],
  ['Ramnagar', 'ramnagar', 'ramnagarAvg', 'ramnagarMin'],
  ['Dharmapuri', 'dharmapuri', 'dharmapuriAvg', 'dharmapuriMin']
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [marketRate, setMarketRate] = useState(null);
  const [rateIndex, setRateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    api
      .get('/driver/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setApiError('Driver API not available. Redeploy the backend to Vercel.');
        } else {
          setApiError(err.response?.data?.error || 'Could not load dashboard');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get('/market-rates/latest')
      .then((r) => setMarketRate(r.data))
      .catch(() => {});
    const interval = setInterval(() => {
      api.get('/market-rates/latest').then((r) => setMarketRate(r.data)).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!marketRate) return undefined;
    const id = setInterval(() => {
      setRateIndex((i) => (i + 1) % MARKET_LOCATIONS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [marketRate]);

  const [rateLabel, rateKey, rateAvgKey, rateMinKey] = MARKET_LOCATIONS[rateIndex];
  const vehicle = data?.vehicle;
  const tripId = vehicle?._id ? String(vehicle._id).slice(-8).toUpperCase() : '';

  return (
    <DriverShell title="Driver Dashboard">
      {loading ? (
        <div className="spinner" />
      ) : apiError ? (
        <p className="form-error">{apiError}</p>
      ) : (
        <>
          {marketRate && (
            <>
              <p className="section-title">Live Market Rate</p>
              <div className={rateStyles.rateCarousel}>
                <div key={rateIndex} className={rateStyles.rateCardSingle}>
                  <span className={rateStyles.rateLoc}>{rateLabel}</span>
                  <span className={rateStyles.rateVal}>₹{marketRate[rateKey] ?? '—'}</span>
                  <span className={rateStyles.rateUnit}>Avg: ₹{marketRate[rateAvgKey] ?? '—'}</span>
                  <span className={rateStyles.rateUnit}>Min: ₹{marketRate[rateMinKey] ?? '—'}</span>
                </div>
                <div className={rateStyles.rateDots} aria-hidden>
                  {MARKET_LOCATIONS.map(([label], i) => (
                    <span
                      key={label}
                      className={`${rateStyles.rateDot} ${i === rateIndex ? rateStyles.rateDotOn : ''}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {data?.noVehicle ? (
            <div className="card">
              <strong>No trip assigned</strong>
              <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
                When admin assigns a trip under Driver → Vehicles and selects your name, it will appear
                here with your trip ID.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ background: 'var(--amber)', color: '#fff', border: 'none' }}>
                <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>Assigned Trip · {tripId}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{vehicle?.vehicleNumber}</div>
                <div style={{ fontSize: 22, fontWeight: 600, margin: '4px 0' }}>
                  {formatINR(vehicle?.balance)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Vehicle Balance</div>
                <div className={styles.heroActions} style={{ marginTop: 12, marginBottom: 0 }}>
                  <Link to="/expense" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
                    + Record Expense
                  </Link>
                  <Link to="/parties" className={`${styles.heroBtn} ${styles.heroBtnSecondary}`}>
                    + Party Entry
                  </Link>
                </div>
              </div>

              <div className={styles.statGrid}>
                <div className="card" style={{ margin: 0 }}>
                  <div className={`${styles.statVal} ${styles.pos}`}>{formatINR(vehicle?.advanceTotal)}</div>
                  <div className={styles.statLbl}>Advance</div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className={`${styles.statVal} ${styles.neg}`}>{formatINR(data?.todaySpent)}</div>
                  <div className={styles.statLbl}>Today Spent</div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className={`${styles.statVal} ${styles.neg}`}>{formatINR(vehicle?.expenseTotal)}</div>
                  <div className={styles.statLbl}>Total Expense</div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className={styles.statVal} style={{ color: '#856404' }}>
                    {data?.pendingCount ?? 0}
                  </div>
                  <div className={styles.statLbl}>Pending Entries</div>
                </div>
              </div>

              <p className="section-title">Recent Expenses</p>
              {(data?.recentExpenses || []).length === 0 ? (
                <p style={{ fontSize: 12, color: '#888' }}>No expenses yet.</p>
              ) : (
                data.recentExpenses.map((e) => (
                  <div key={e._id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{e.category}</strong>
                      <span className={styles.neg}>-{formatINR(e.amount)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {formatDateDayMonth(e.date)}
                      {e.remarks ? ` · ${e.remarks}` : ''}
                    </div>
                  </div>
                ))
              )}

            </>
          )}
        </>
      )}
    </DriverShell>
  );
}
