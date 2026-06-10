import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';
import dr from './Driver.module.css';

export default function Parties() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/driver/party-batches')
      .then((r) => setBatches(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.driverName?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.assignedDate?.includes(q)
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
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>No party batches yet.</p>
      ) : (
        filtered.map((b) => (
          <button
            key={b._id}
            type="button"
            className={`card ${dr.vehicleCardClick}`}
            style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}
            onClick={() => navigate(`/admin/driver/parties/batch/${b._id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{b.assignedDate ? formatDateDayMonth(b.assignedDate) : '—'}</strong>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {b.city || '—'} · {b.userCount || b.entries?.length || 0} user
                  {(b.userCount || b.entries?.length || 0) !== 1 ? 's' : ''} · Driver: {b.driverName || '—'}
                </div>
              </div>
              {b.status === 'submitted' ? (
                <span className="badge badge-green">Submitted</span>
              ) : (
                <span className="badge badge-amber">Awaiting driver</span>
              )}
            </div>
          </button>
        ))
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
