import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { deduplicatedGet } from '../../api/client';
import { formatDateShort } from '../../utils/format';
import styles from './MarketRates.module.css';

const LOCS = [
  { label: 'Coimbatore', key: 'coimbatore', avgKey: 'coimbatoreAvg', minKey: 'coimbatoreMin', abbr: 'CBE' },
  { label: 'Mamballi', key: 'mamballi', avgKey: 'mamballiAvg', minKey: 'mamballiMin', abbr: 'MBL' },
  { label: 'Ramnagar', key: 'ramnagar', avgKey: 'ramnagarAvg', minKey: 'ramnagarMin', abbr: 'RNG' },
  { label: 'Dharmapuri', key: 'dharmapuri', avgKey: 'dharmapuriAvg', minKey: 'dharmapuriMin', abbr: 'DHP' }
];

const SUMMARY_ROTATE_MS = 3000;

function SummaryRotator({ latest }) {
  const slides = useMemo(
    () =>
      LOCS.map((loc) => {
        const rate = latest[loc.key];
        const avg = latest[loc.avgKey];
        const min = latest[loc.minKey];
        return `${loc.label}: ₹${rate ?? '—'} · Avg: ₹${avg ?? '—'} · Min: ₹${min ?? '—'}`;
      }),
    [latest]
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SUMMARY_ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const loc = LOCS[index];
  const rate = latest[loc.key];
  const avg = latest[loc.avgKey];
  const min = latest[loc.minKey];

  return (
    <div className={styles.summaryRotator} aria-live="polite">
      <div key={loc.key} className={styles.summarySlide}>
        <span>🏛️ {loc.label}: </span>
        <span className={styles.summaryRate}>{rate > 0 ? `₹${rate}/kg` : '-'}</span>
        {' · '}
        <span className={styles.summaryAvg}>Avg: {avg > 0 ? `₹${avg}` : '-'}</span>
        {' · '}
        <span className={styles.summaryAvg}>Min: {min > 0 ? `₹${min}` : '-'}</span>
      </div>
    </div>
  );
}

export default function MarketRates() {
  const navigate = useNavigate();
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    deduplicatedGet('/market-rates', {}, 60_000)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (Array.isArray(data)) {
          setHistory(data);
          setLatest(data[0] || null);
        } else {
          setHistory(data.history || []);
          setLatest(data.latest ?? data.history?.[0] ?? null);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Market Rates">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Silk Cocoon Market Rates</h2>
            <p className={styles.headerSub}>Daily market price updates & historical rate tracking</p>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => navigate('/admin/market-rates/update')}
          >
            <span>+</span> Add Market Rate
          </button>
        </div>

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Today's Hero Banner */}
            {latest ? (
              <div className={styles.todayBanner}>
                <div className={styles.todayBannerHead}>
                  <h3 className={styles.todayTitle}>
                    <span>📈</span> Today's Market Rates
                  </h3>
                  <span className={styles.todayDateChip}>
                    🗓️ {formatDateShort(latest.date)}
                  </span>
                </div>

                <div className={styles.marketGrid}>
                  {LOCS.map((loc) => (
                    <div key={loc.key} className={styles.marketLocationCard}>
                      <span className={styles.locBadge}>{loc.label}</span>
                      <div className={styles.locRate}>
                        {latest[loc.key] > 0 ? `₹${latest[loc.key]}` : '-'}
                      </div>
                      <div className={styles.locSubDetails}>
                        <span>Avg: {latest[loc.avgKey] > 0 ? `₹${latest[loc.avgKey]}` : '-'}</span>
                        <span>Min: {latest[loc.minKey] > 0 ? `₹${latest[loc.minKey]}` : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <SummaryRotator latest={latest} />
              </div>
            ) : (
              <div className={styles.emptyState}>
                No rates entered today. Tap <strong>+ Add Market Rate</strong> to enter today's rates.
              </div>
            )}

            {/* Historical Rate Table Section */}
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <h3 className={styles.historyTitle}>
                  <span>📜</span> Rate History
                </h3>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      {LOCS.map((loc) => (
                        <th key={loc.abbr}>{loc.label} ({loc.abbr})</th>
                      ))}
                      <th style={{ textAlignment: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row._id} className={styles.historyRow}>
                        <td>🗓️ {formatDateShort(row.date)}</td>
                        {LOCS.map((loc) => (
                          <td key={loc.key}>
                            <strong>{row[loc.key] > 0 ? `₹${row[loc.key]}` : '-'}</strong>
                          </td>
                        ))}
                        <td>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() =>
                              navigate(`/admin/market-rates/update?id=${row._id}`)
                            }
                          >
                            ✎ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className={styles.legendText}>
                * CBE = Coimbatore · MBL = Mamballi · RNG = Ramnagar · DHP = Dharmapuri
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
