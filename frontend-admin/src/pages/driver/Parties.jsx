import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';
import dr from './Driver.module.css';

export default function Parties() {
  const navigate = useNavigate();
  const location = useLocation();
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/driver/party-batches', {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      })
      .then((r) => setBatches(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        setBatches([]);
        setError(err.response?.data?.error || 'Could not load party batches');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname, location.key]);

  const filtered = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const userCount = b.userCount || b.entries?.length || 0;
    return (
      b.driverName?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.assignedDate?.includes(q) ||
      String(userCount).includes(q)
    );
  });

  return (
    <AppShell
      title="Parties"
      driverSection
      headerRight={
        <button type="button" className="topLink" onClick={() => navigate('/admin/driver/parties/new')}>
          + Add
        </button>
      }
    >
      <input
        className="field-input"
        placeholder="Search date, location or driver..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>No party batches yet.</p>
      ) : (
        filtered.map((b) => {
          const userCount = b.userCount || b.entries?.length || 0;
          return (
            <button
              key={b._id}
              type="button"
              className={`card ${dr.vehicleCardClick}`}
              style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}
              onClick={() => navigate(`/admin/driver/parties/batch/${b._id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{b.driverName || '—'}</strong>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {b.assignedDate ? formatDateDayMonth(b.assignedDate) : '—'} · {b.city || '—'} ·{' '}
                    {userCount} user{userCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {b.status === 'submitted' ? (
                  <span className="badge badge-green">Submitted</span>
                ) : (
                  <span className="badge badge-amber">Awaiting driver</span>
                )}
              </div>
            </button>
          );
        })
      )}
      <button
        type="button"
        className="btn-outline"
        style={{ marginTop: 8 }}
        onClick={() => navigate('/admin/driver/rates')}
      >
        Global rate settings
      </button>
    </AppShell>
  );
}
