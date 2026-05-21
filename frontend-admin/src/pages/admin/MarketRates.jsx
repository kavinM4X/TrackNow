import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort } from '../../utils/format';

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

  const locs = [
    ['Coimbatore', 'coimbatore', 'CBE'],
    ['Mamballi', 'mamballi', 'MBL'],
    ['Ramnagar', 'ramnagar', 'RNG'],
    ['Dharmapuri', 'dharmapuri', 'DHP']
  ];

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
            <div
              className="card"
              style={{ background: 'var(--blue-light)', borderColor: 'var(--blue-border)' }}
            >
              <strong style={{ color: 'var(--blue)', fontSize: 12 }}>
                Today · {formatDateShort(latest.date)}
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, margin: '8px 0', fontSize: 12 }}>
                {locs.map(([label, key]) => (
                  <span key={key}>
                    {label}: <strong>₹{latest[key]}</strong>
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--blue)' }}>
                Top: ₹{latest.topRate} ({latest.topMarket}) | Min Avg: ₹{latest.minAvg}
              </div>
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
              {locs.map(([, , ab]) => (
                <span key={ab}>{ab}</span>
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
                {locs.map(([, key]) => (
                  <span key={key}>₹{row[key]}</span>
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
