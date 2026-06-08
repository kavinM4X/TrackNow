import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

export default function Entries() {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (status) => {
    setLoading(true);
    const q = status ? `?status=${status}` : '';
    api
      .get(`/admin/driver/entries${q}`)
      .then((r) => setEntries(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const setStatus = async (id, status) => {
    await api.patch(`/admin/driver/entries/${id}/status`, { status });
    load(filter);
  };

  return (
    <AppShell
      title="Pending Entries"
      driverSection
      headerRight={
        <span style={{ fontSize: 12, opacity: 0.9 }}>
          {entries.filter((e) => e.status === 'pending').length} pending
        </span>
      }
    >
      <div className={dr.filterRow}>
        {[
          ['', 'All'],
          ['pending', 'Pending'],
          ['approved', 'Approved'],
          ['rejected', 'Rejected']
        ].map(([val, label]) => (
          <button
            key={label}
            type="button"
            className={`${dr.filterChip} ${filter === val ? dr.filterChipOn : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="spinner" />
      ) : (
        entries.map((e) => (
          <div key={e._id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <strong>{e.partyId?.name}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  by {e.vehicleId?.driverName} · {e.date} · {e.vehicleId?.vehicleNumber}
                </div>
              </div>
              <span className={`badge badge-${e.status === 'pending' ? 'amber' : e.status === 'approved' ? 'green' : 'red'}`}>
                {e.status}
              </span>
            </div>
            <div className={dr.entryGrid}>
              <div className={`${dr.entryCell} ${dr.good}`}>
                <div>{e.goodKg} kg</div>
                <div>Good {formatINR(e.goodAmount)}</div>
              </div>
              <div className={`${dr.entryCell} ${dr.waste}`}>
                <div>{e.wasteKg} kg</div>
                <div>Waste {formatINR(e.wasteAmount)}</div>
              </div>
              <div className={`${dr.entryCell} ${dr.double}`}>
                <div>{e.doubleKg || '—'} kg</div>
                <div>Dbl {formatINR(e.doubleAmount)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Total</span>
              <strong className={dr.pos}>{formatINR(e.totalAmount)}</strong>
            </div>
            {e.status === 'pending' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className={dr.approveBtn} onClick={() => setStatus(e._id, 'approved')}>
                  ✓ Approve
                </button>
                <button type="button" className={dr.rejectBtn} onClick={() => setStatus(e._id, 'rejected')}>
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </AppShell>
  );
}
