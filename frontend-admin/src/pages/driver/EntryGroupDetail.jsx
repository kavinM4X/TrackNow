import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import {
  EntryUserRow,
  filterTripEntries,
  publishEntry,
  setEntryStatus
} from './entryShared';
import dr from './Driver.module.css';

export default function EntryGroupDetail() {
  const { date, vehicleNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const statusFilter = location.state?.filter ?? '';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const decodedDate = decodeURIComponent(date || '');
  const decodedVehicle = decodeURIComponent(vehicleNumber || '');

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api
      .get(`/admin/driver/entries${q}`)
      .then((r) => setEntries(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const tripEntries = useMemo(
    () => filterTripEntries(entries, decodedDate, decodedVehicle),
    [entries, decodedDate, decodedVehicle]
  );

  const driverName = tripEntries[0]?.vehicleId?.driverName || '—';
  const pendingCount = tripEntries.filter((e) => e.status === 'pending').length;

  const publishToClient = async (id) => {
    setMessage('');
    setError('');
    try {
      const res = await publishEntry(id);
      const name = res.data?.clientUserName;
      if (name) {
        setMessage(`Published to ${name}`);
      } else {
        setError('Server could not link this entry to a client user.');
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not publish to client');
    }
  };

  const updateStatus = async (id, status) => {
    setMessage('');
    setError('');
    try {
      const res = await setEntryStatus(id, status);
      if (status === 'approved' && res.data?.clientUserName) {
        setMessage(`Approved & published to ${res.data.clientUserName}`);
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update entry');
    }
  };

  return (
    <AppShell
      title={`${decodedDate} · ${decodedVehicle}`}
      backPath="/admin/driver/entries"
      driverSection
      hideNav
      headerRight={
        pendingCount > 0 ? (
          <span className="badge badge-amber">{pendingCount} pending</span>
        ) : null
      }
    >
      <div className={`card ${dr.entryGroupCard}`} style={{ marginBottom: 12 }}>
        <div className={dr.entryGroupHead}>
          <div>
            <strong className={dr.entryGroupTitle}>
              {decodedDate} · {decodedVehicle}
            </strong>
            <div className={dr.entryGroupSub}>
              by {driverName} · {tripEntries.length} user{tripEntries.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="spinner" />
      ) : tripEntries.length === 0 ? (
        <p className="empty-text">No entries found for this trip</p>
      ) : (
        <div className={`card ${dr.entryGroupCard}`}>
          {tripEntries.map((e) => (
            <EntryUserRow
              key={e._id}
              entry={e}
              onApprove={(id) => updateStatus(id, 'approved')}
              onReject={(id) => updateStatus(id, 'rejected')}
              onPublish={publishToClient}
              onViewHistory={(clientId) => navigate(`/admin/batch-history/user/${clientId}`)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
