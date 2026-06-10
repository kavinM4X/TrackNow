import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

export default function Entries() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const publishToClient = async (id) => {
    setMessage('');
    setError('');
    try {
      let res;
      try {
        res = await api.post(`/admin/driver/entries/${id}/publish`);
      } catch (postErr) {
        if (postErr.response?.status === 404) {
          res = await api.patch(`/admin/driver/entries/${id}/status`, { status: 'approved' });
        } else {
          throw postErr;
        }
      }
      const name = res.data?.clientUserName;
      const date = res.data?.batchDate || res.data?.date;
      const loc = res.data?.batchLocation;
      if (name) {
        setMessage(
          `Published to ${name}${date ? ` — ${date}` : ''}${loc ? ` · ${loc}` : ''}`
        );
      } else {
        setError('Server could not link this entry to a client user. Redeploy the API or use local backend.');
      }
      load(filter);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not publish to client');
    }
  };

  const setStatus = async (id, status) => {
    setMessage('');
    setError('');
    try {
      const res = await api.patch(`/admin/driver/entries/${id}/status`, { status });
      if (status === 'approved' && res.data?.clientUserName) {
        setMessage(
          `Approved & published to ${res.data.clientUserName} (${res.data.clientBatchId ? 'batch created' : 'check sync'})`
        );
      }
      load(filter);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update entry');
    }
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
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}
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
            {e.status === 'approved' && (e.clientUserId || e.partyId?.clientUserId) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <p style={{ fontSize: 11, color: '#2e7d52', margin: 0 }}>
                  Linked to client: {e.clientUserId?.name || e.partyId?.name}
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: 12 }}
                  onClick={() => publishToClient(e._id)}
                >
                  Sync to client app
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: 12 }}
                  onClick={() =>
                    navigate(
                      `/admin/batch-history/user/${e.clientUserId?._id || e.clientUserId || e.partyId.clientUserId._id || e.partyId.clientUserId}`
                    )
                  }
                >
                  View batch history
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </AppShell>
  );
}
