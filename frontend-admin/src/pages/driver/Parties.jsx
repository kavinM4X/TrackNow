import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';

export default function Parties() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/driver/parties')
      .then((r) => setParties(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = parties.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.village?.toLowerCase().includes(search.toLowerCase())
  );

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
        placeholder="Search party or village..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      {loading ? (
        <div className="spinner" />
      ) : (
        filtered.map((p) => (
          <div key={p._id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {p.phone} · {p.village}
                  {p.city ? ` · ${p.city}` : ''}
                  {p.driverName ? ` · Driver: ${p.driverName}` : ''}
                  {p.assignedDate ? ` · ${p.assignedDate}` : ''}
                </div>
              </div>
              {p.pendingCount > 0 ? (
                <span className="badge badge-amber">{p.pendingCount} pending</span>
              ) : (
                <span className="badge badge-green">OK</span>
              )}
            </div>
            {p.lastEntry && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Last: {p.lastEntry.date} · {formatINR(p.lastEntry.totalAmount)}
              </div>
            )}
            <button
              type="button"
              className="btn-outline"
              style={{ marginTop: 8, fontSize: 12 }}
              onClick={() => navigate(`/admin/driver/parties/${p._id}/edit`)}
            >
              Edit party / rates
            </button>
          </div>
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
