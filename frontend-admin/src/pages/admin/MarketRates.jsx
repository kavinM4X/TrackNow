import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
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
        {loc.label}: <span className={styles.summaryRate}>₹{rate ?? '—'}</span>
        {' · '}
        <span className={styles.summaryAvg}>Avg: ₹{avg ?? '—'}</span>
        {' · '}
        <span className={styles.summaryAvg}>Min: ₹{min ?? '—'}</span>
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
    api
      .get('/market-rates')
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
    <AppShell
      title="Market Rates"
      headerRight={
        <button type="button" className="topLink" onClick={() => navigate('/admin/market-rates/update')}>
          + Add
        </button>
      }
    >
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {latest ? (
            <div className={styles.todayCard}>
              <div className={styles.todayHead}>Today · {formatDateShort(latest.date)}</div>
              <div className={styles.marketGrid}>
                {LOCS.map((loc) => (
                  <span key={loc.key}>
                    {loc.label}: <strong>₹{latest[loc.key]}</strong>
                  </span>
                ))}
              </div>
              <SummaryRotator latest={latest} />
            </div>
          ) : (
            <p className="form-error" style={{ background: '#fef3cd', padding: 10, borderRadius: 8 }}>
              No rate entered today. Tap + Add to enter today&apos;s rate.
            </p>
          )}

          <p className="section-title">Rate History</p>
          <div style={{ overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr repeat(4, 1fr) auto',
                gap: 4,
                fontSize: 11,
                color: 'var(--blue)',
                padding: '4px 8px',
                background: '#f0f4f9',
                borderRadius: 4
              }}
            >
              <span>Date</span>
              {LOCS.map((loc) => (
                <span key={loc.abbr}>{loc.abbr}</span>
              ))}
              <span />
            </div>
            {history.map((row) => (
              <div
                key={row._id}
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr repeat(4, 1fr) auto',
                  gap: 4,
                  padding: '8px',
                  fontSize: 12,
                  alignItems: 'center'
                }}
              >
                <span>{formatDateShort(row.date)}</span>
                {LOCS.map((loc) => (
                  <span key={loc.key}>₹{row[loc.key]}</span>
                ))}
                <button
                  type="button"
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/market-rates/update?id=${row._id}`)}
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#bbb', textAlign: 'center' }}>
            CBE=Coimbatore MBL=Mamballi RNG=Ramnagar DHP=Dharmapuri
          </p>
        </>
      )}
    </AppShell>
  );
}
