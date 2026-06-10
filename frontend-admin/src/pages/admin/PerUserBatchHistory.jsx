import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { defaultHistoryDateRange, formatDateShort, formatINR, shortUserId } from '../../utils/format';

export default function PerUserBatchHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalBatches: 0, totalGoodSilkKg: 0, totalWasteKg: 0, totalEstimatedValue: 0 });
  const [userName, setUserName] = useState('User');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    ...defaultHistoryDateRange(),
    location: 'all',
    search: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/batches/history', {
        params: { ...filters, userId }
      });
      setRows(res.data.rows || []);
      setSummary(res.data.summary || { totalBatches: 0, totalGoodSilkKg: 0, totalWasteKg: 0, totalEstimatedValue: 0 });
      const first = (res.data.rows || [])[0];
      if (first?.userName) setUserName(first.userName);
      else {
        const userRes = await api.get(`/admin/users/${userId}`);
        setUserName(userRes.data?.user?.name || 'User');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filters.fromDate, filters.toDate, filters.location, filters.search]);

  const exportCsv = async () => {
    const res = await api.get('/admin/batches/history', {
      params: { ...filters, userId, export: 'csv' },
      responseType: 'blob'
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userName.replace(/\s+/g, '-').toLowerCase()}-batch-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title={userName} backPath="/admin/batch-history">
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 12 }}>Batch History · {shortUserId(userId)}</p>

      <div className="card" style={{ background: '#e3eef9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
          <div>
            <div style={{ color: '#6b7280' }}>Total Batches</div>
            <strong style={{ fontSize: 20, color: '#1e4d7b' }}>{summary.totalBatches || 0}</strong>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>Total Good Silk</div>
            <strong style={{ fontSize: 20, color: '#2E7D52' }}>{Math.round(summary.totalGoodSilkKg || 0)} kg</strong>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>Total Waste</div>
            <strong style={{ fontSize: 20, color: '#F5A623' }}>{Math.round(summary.totalWasteKg || 0)} kg</strong>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>Est. Total Value</div>
            <strong style={{ fontSize: 20, color: '#1e4d7b' }}>{formatINR(summary.totalEstimatedValue || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
          <select
            className="field-select"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          >
            <option value="all">All Markets</option>
            <option value="Coimbatore">Coimbatore</option>
            <option value="Mamballi">Mamballi</option>
            <option value="Ramnagar">Ramnagar</option>
            <option value="Dharmapuri">Dharmapuri</option>
          </select>
          <input
            className="field-input"
            placeholder="Search date / location..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <p className="empty-text">No batch entries for this user in selected range.</p>
      ) : (
        rows.map((r) => (
          <div key={r._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{formatDateShort(r.date)} · {r.location}</strong>
              <span className="badge badge-green">Done</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#2E7D52', fontWeight: 600 }}>{r.goodSilkKg}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Good kg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#F5A623', fontWeight: 600 }}>{r.wasteKg}</div>
                <div style={{ color: '#888', fontSize: 10 }}>Waste</div>
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

      <button type="button" className="btn-outline" style={{ width: '100%' }} onClick={() => navigate('/admin/batch-history')}>
        Back to All History
      </button>
      <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={exportCsv}>
        Export as Excel
      </button>
    </AppShell>
  );
}

