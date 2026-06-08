import { useEffect, useState } from 'react';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/driver/parties')
      .then((res) => setParties(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load parties');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DriverShell title="Parties">
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : parties.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>No parties configured yet. Ask admin to add parties.</p>
      ) : (
        parties.map((p) => (
          <div key={p._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {p.village || '—'}
                  {p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              {p.pendingCount > 0 && (
                <span className="badge badge-pending">{p.pendingCount} pending</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
              Rates: Good {formatINR(p.goodRateOverride ?? '—')} · Waste{' '}
              {formatINR(p.wasteRateOverride ?? '—')} · Double{' '}
              {formatINR(p.doubleRateOverride ?? '—')}
            </div>
            {p.lastEntry && (
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Last entry: {formatDateDayMonth(p.lastEntry.date)} ·{' '}
                {formatINR(p.lastEntry.totalAmount)}
              </div>
            )}
          </div>
        ))
      )}
    </DriverShell>
  );
}
