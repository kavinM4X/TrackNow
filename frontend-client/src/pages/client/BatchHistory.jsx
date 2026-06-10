import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import { displayTotalKg, formatDateShort, formatINR } from '../../utils/format';

export default function BatchHistory() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [totalKg, setTotalKg] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/batches/my')
      .then((res) => {
        setBatches(res.data.batches || []);
        setTotalKg(res.data.totalKg || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = batches.filter((b) =>
    formatDateShort(b.date).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Batch History">
      <input
        className="field-input"
        placeholder="Search by date (e.g. Apr 2026)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      <div
        style={{
          background: 'var(--green-light)',
          border: '1px solid var(--green-border)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 12,
          fontSize: 13
        }}
      >
        <span style={{ color: 'var(--green)' }}>Total Silk Harvested</span>
        <strong style={{ color: 'var(--green)' }}>{totalKg} kg</strong>
      </div>

      {search && (
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
          Showing {filtered.length} of {batches.length}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : batches.length === 0 ? (
        <p className="empty-text">
          No batch history yet. After delivery, your admin will enter weights and prices (Good silk,
          Waste, Doubles) — then it will appear here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">No batches match your search</p>
      ) : (
        filtered.map((b) => (
          <div
            key={b._id}
            className="card"
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => navigate(`/batch-history/${b._id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/batch-history/${b._id}`)}
          >
            <div>
              <strong>{formatDateShort(b.date)}</strong>
              <div style={{ fontSize: 12, color: '#888' }}>
                {b.location} · {displayTotalKg(b)} kg
              </div>
              {(b.displayFinalAmount ?? b.estimatedValue) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, fontWeight: 600 }}>
                  {formatINR(b.displayFinalAmount ?? b.estimatedValue)}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Tap to view rates &amp; details →
              </div>
            </div>
            <Badge status="done" label="Done" />
          </div>
        ))
      )}
    </AppShell>
  );
}
