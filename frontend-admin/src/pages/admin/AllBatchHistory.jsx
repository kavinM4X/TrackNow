import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, formatINR, initials, MARKETS, shortUserId, todayISO } from '../../utils/format';

function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function AllBatchHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalBatches: 0, totalGoodSilkKg: 0, totalEstimatedValue: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    location: 'all',
    fromDate: monthStartISO(),
    toDate: todayISO()
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/batches/history', { params: filters });
      setRows(res.data.rows || []);
      setSummary(res.data.summary || { totalBatches: 0, totalGoodSilkKg: 0, totalEstimatedValue: 0 });
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.userId, filters.location, filters.fromDate, filters.toDate]);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === filters.userId),
    [users, filters.userId]
  );

  const exportCsv = async () => {
    const res = await api.get('/admin/batches/history', {
      params: { ...filters, export: 'csv' },
      responseType: 'blob'
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-batch-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="All Batch History">
      <div className="card" style={{ marginBottom: 8 }}>
        <input
          className="field-input"
          placeholder="Search user, location, date..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <select
            className="field-select"
            value={filters.userId}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({shortUserId(u._id)})
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          >
            <option value="all">All Markets</option>
            {MARKETS.map((m) => (
              <option key={m.label} value={m.label}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="field-input"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          />
          <input
            type="date"
            className="field-input"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div className="card" style={{ margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--blue)' }}>{summary.totalBatches || 0}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Batches</div>
        </div>
        <div className="card" style={{ margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--green)' }}>{Math.round(summary.totalGoodSilkKg || 0)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Good Silk kg</div>
        </div>
        <div className="card" style={{ margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--blue)' }}>{formatINR(summary.totalEstimatedValue || 0)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Est. Value</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <p className="empty-text">No batch history for selected filters.</p>
      ) : (
        rows.map((r) => (
          <div
            key={r._id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/admin/batch-history/user/${r.userId}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/batch-history/user/${r.userId}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  background: '#e3eef9',
                  color: '#1e4d7b'
                }}
              >
                {initials(r.userName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.userName}</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {formatDateShort(r.date)} · {r.location}
                </div>
              </div>
              <span className="badge badge-green">Done</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#2E7D52', fontWeight: 600 }}>{r.goodSilkKg}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Good kg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#F5A623', fontWeight: 600 }}>{r.wasteKg}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Waste kg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#A0522D', fontWeight: 600 }}>{r.doublesKg}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Doubles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#1E4D7B', fontWeight: 600 }}>{formatINR(r.estimatedValue)}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Value</div>
              </div>
            </div>
          </div>
        ))
      )}

      {selectedUser && (
        <button
          type="button"
          className="btn-outline"
          style={{ width: '100%' }}
          onClick={() => navigate(`/admin/batch-history/user/${selectedUser._id}`)}
        >
          View {selectedUser.name} History
        </button>
      )}
      <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={exportCsv}>
        Export as Excel
      </button>
    </AppShell>
  );
}

