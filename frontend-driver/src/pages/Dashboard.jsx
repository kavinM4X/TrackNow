import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from './Dashboard.module.css';

const MARKET_LOCATIONS = [
  ['Coimbatore', 'coimbatore', 'coimbatoreAvg', 'coimbatoreMin', 'CBE'],
  ['Mamballi', 'mamballi', 'mamballiAvg', 'mamballiMin', 'MBL'],
  ['Ramnagar', 'ramnagar', 'ramnagarAvg', 'ramnagarMin', 'RNG'],
  ['Dharmapuri', 'dharmapuri', 'dharmapuriAvg', 'dharmapuriMin', 'DHP']
];

function categoryIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('fuel') || c.includes('diesel') || c.includes('petrol')) return '⛽';
  if (c.includes('food') || c.includes('tiffin') || c.includes('tea')) return '🍲';
  if (c.includes('toll')) return '🛣️';
  if (c.includes('repair') || c.includes('maint')) return '🔧';
  if (c.includes('unloading') || c.includes('load')) return '📦';
  return '💸';
}

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
          setApiError('Driver API not available. Redeploy backend.');
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

  const [rateLabel, rateKey, rateAvgKey, rateMinKey, rateAbbr] = MARKET_LOCATIONS[rateIndex];
  const vehicle = data?.vehicle;
  const tripId = vehicle?._id ? String(vehicle._id).slice(-6).toUpperCase() : '';

  return (
    <DriverShell title="Driver Dashboard">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : apiError ? (
          <p className="form-error">{apiError}</p>
        ) : (
          <>
            {/* Live Market Rates Hero Banner */}
            {marketRate && (
              <div className={styles.rateCarouselCard}>
                <div className={styles.rateHeader}>
                  <span className={styles.rateTitle}>
                    <span>📈</span> Live Market Rates
                  </span>
                  <span className={styles.rateLiveBadge}>● LIVE</span>
                </div>

                <div className={styles.rateBody}>
                  <div>
                    <div className={styles.rateLocName}>
                      {rateLabel} ({rateAbbr})
                    </div>
                  </div>
                  <div className={styles.rateBigVal}>
                    ₹{marketRate[rateKey] ?? '—'} <small style={{ fontSize: 13, fontWeight: 500 }}>/ kg</small>
                  </div>
                </div>

                <div className={styles.rateSubGrid}>
                  <span>Avg Rate: <strong>₹{marketRate[rateAvgKey] ?? '—'}</strong></span>
                  <span>·</span>
                  <span>Min Rate: <strong>₹{marketRate[rateMinKey] ?? '—'}</strong></span>
                </div>

                <div className={styles.rateDotsRow} aria-hidden>
                  {MARKET_LOCATIONS.map(([label], i) => (
                    <span
                      key={label}
                      className={`${styles.rateDot} ${i === rateIndex ? styles.rateDotActive : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trip Assignment & Balance Hero */}
            {data?.noVehicle ? (
              <div className={styles.emptyCard}>
                <strong>No Active Logistics Trip Assigned</strong>
                <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
                  When admin assigns a trip under Driver → Vehicles, your vehicle balance and assigned trip ID will automatically appear here.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.tripHeroCard}>
                  <div className={styles.tripHeroTop}>
                    <span className={styles.tripIdBadge}>TRIP #{tripId}</span>
                    <span className={styles.vehicleNum}>🚚 {vehicle?.vehicleNumber}</span>
                  </div>

                  <div className={styles.balanceMeta}>
                    <span className={styles.balanceLbl}>Vehicle Cash Balance</span>
                    <span className={styles.balanceVal}>
                      {formatINR(vehicle?.balance)}
                    </span>
                  </div>

                  <div className={styles.heroActions}>
                    <Link to="/expense" className={styles.heroBtnPrimary}>
                      <span>➕</span> Record Expense
                    </Link>
                    <Link to="/parties" className={styles.heroBtnSecondary}>
                      <span>➕</span> Party Entry
                    </Link>
                  </div>
                </div>

                {/* 4-Stat Overview */}
                <div className={styles.statGrid}>
                  <div className={styles.statCard}>
                    <span className={`${styles.statVal} ${styles.statValGreen}`}>
                      {formatINR(vehicle?.advanceTotal)}
                    </span>
                    <span className={styles.statLbl}>💵 Advance Received</span>
                  </div>

                  <div className={styles.statCard}>
                    <span className={`${styles.statVal} ${styles.statValDanger}`}>
                      {formatINR(data?.todaySpent)}
                    </span>
                    <span className={styles.statLbl}>💸 Today Spent</span>
                  </div>

                  <div className={styles.statCard}>
                    <span className={`${styles.statVal} ${styles.statValDanger}`}>
                      {formatINR(vehicle?.expenseTotal)}
                    </span>
                    <span className={styles.statLbl}>📉 Total Expense</span>
                  </div>

                  <div className={styles.statCard}>
                    <span className={`${styles.statVal} ${styles.statValAmber}`}>
                      {data?.pendingCount ?? 0}
                    </span>
                    <span className={styles.statLbl}>⏳ Pending Entries</span>
                  </div>
                </div>

                {/* Recent Expense Activity */}
                <div className={styles.sectionHead}>
                  <span>📝 Recent Trip Expenses</span>
                </div>

                {(data?.recentExpenses || []).length === 0 ? (
                  <div className={styles.emptyCard}>No expenses recorded for this trip yet.</div>
                ) : (
                  <div className={styles.expenseFeed}>
                    {data.recentExpenses.map((e) => (
                      <div key={e._id} className={styles.expenseCard}>
                        <div className={styles.expenseLeft}>
                          <div className={styles.catIconBox}>{categoryIcon(e.category)}</div>
                          <div className={styles.expenseMeta}>
                            <span className={styles.catTitle}>{e.category}</span>
                            <span className={styles.expenseSub}>
                              🗓️ {formatDateDayMonth(e.date)}
                              {e.remarks ? ` · ${e.remarks}` : ''}
                            </span>
                          </div>
                        </div>

                        <span className={styles.expenseVal}>
                          − {formatINR(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DriverShell>
  );
}
