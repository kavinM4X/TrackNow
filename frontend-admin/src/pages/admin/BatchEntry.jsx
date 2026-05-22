import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, formatINR, todayISO } from '../../utils/format';
import { normalizeVehicleRentalSession } from '../../utils/publicClientUrl';
import styles from './BatchEntry.module.css';
import vr from './VehicleRental.module.css';

export default function BatchEntry() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState('Coimbatore');
  const [vehicleOwnerName, setVehicleOwnerName] = useState('');
  const [rentalAmount, setRentalAmount] = useState('');
  const [expiryHours, setExpiryHours] = useState(8);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState(null);
  const [error, setError] = useState('');

  const loadSessions = () => {
    api
      .get('/admin/vehicle-rentals')
      .then((r) => setSessions(r.data.map(normalizeVehicleRentalSession)))
      .catch(console.error);
  };

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data.filter((u) => u.role === 'user')));
    loadSessions();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q)
    );
  }, [users, search]);

  const toggleUser = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onGenerate = async () => {
    setError('');
    if (!vehicleOwnerName.trim()) {
      setError('Enter vehicle owner name');
      return;
    }
    if (!rentalAmount || Number(rentalAmount) <= 0) {
      setError('Enter rental amount');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Add at least one user');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/admin/vehicle-rentals', {
        date,
        location,
        vehicleOwnerName: vehicleOwnerName.trim(),
        rentalAmount: Number(rentalAmount),
        expiryHours,
        userIds: selectedIds
      });
      setLastLink(normalizeVehicleRentalSession(res.data));
      setSelectedIds([]);
      setSearch('');
      loadSessions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (!lastLink?.driverUrl) return;
    navigator.clipboard?.writeText(lastLink.driverUrl);
    alert('Link copied');
  };

  return (
    <AppShell title="Batch Entry" backPath="/admin/dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <button type="button" className="btn-primary" disabled>
          Vehicle Rental
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => navigate('/admin/batch-entry/manual')}
        >
          Manual Entry
        </button>
      </div>

      <div className="card">
        <label className="field-label">Date</label>
        <input
          type="date"
          className="field-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <p className={vr.sectionTitle}>
          <span className={vr.sectionBar} />
          Vehicle Rental
        </p>

        <label className="field-label">Vehicle owner name</label>
        <input
          className="field-input"
          placeholder="e.g. Murugan Transport"
          value={vehicleOwnerName}
          onChange={(e) => setVehicleOwnerName(e.target.value)}
        />

        <label className="field-label">Rental amount (₹)</label>
        <input
          type="number"
          min="0"
          className="field-input"
          placeholder="12000"
          value={rentalAmount}
          onChange={(e) => setRentalAmount(e.target.value)}
        />

        <label className="field-label">Market</label>
        <select
          className="field-select"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="Coimbatore">Coimbatore</option>
          <option value="Mamballi">Mamballi</option>
          <option value="Ramnagar">Ramnagar</option>
          <option value="Dharmapuri">Dharmapuri</option>
        </select>

        <p className={vr.sectionTitle}>
          <span className={vr.sectionBar} />
          Add users
        </p>
        <input
          className="field-input"
          placeholder="Search user to add…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {selectedIds.length > 0 && (
          <div className={vr.chips}>
            {selectedIds.map((id) => {
              const u = users.find((x) => x._id === id);
              return (
                <button
                  key={id}
                  type="button"
                  className={vr.chip}
                  onClick={() => toggleUser(id)}
                >
                  {u?.name || id} ×
                </button>
              );
            })}
          </div>
        )}

        <div className={vr.userPickList}>
          {filteredUsers.slice(0, 8).map((u) => (
            <button
              key={u._id}
              type="button"
              className={`${vr.userPick} ${selectedIds.includes(u._id) ? vr.userPickOn : ''}`}
              onClick={() => toggleUser(u._id)}
            >
              {u.name}
            </button>
          ))}
        </div>
        <p className={styles.hint}>{selectedIds.length} user(s) added for driver entry</p>

        <p className={vr.sectionTitle}>
          <span className={vr.sectionBar} />
          Link expiry
        </p>
        <div className={vr.expiryRow}>
          {[6, 8, 10].map((h) => (
            <button
              key={h}
              type="button"
              className={`${vr.expiryBtn} ${expiryHours === h ? vr.expiryBtnOn : ''}`}
              onClick={() => setExpiryHours(h)}
            >
              {h} hr
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: 8 }}
          disabled={creating}
          onClick={onGenerate}
        >
          {creating ? 'Generating…' : 'Generate & Share Link'}
        </button>

        {lastLink?.driverUrl && (
          <div className={vr.linkBox}>
            <span className={vr.linkText}>{lastLink.driverUrl}</span>
            <button type="button" className={vr.copyBtn} onClick={copyLink}>
              Copy
            </button>
          </div>
        )}
      </div>

      <p className="section-title">Driver sessions</p>
      {sessions.length === 0 ? (
        <p className="empty-text">No vehicle rental sessions yet</p>
      ) : (
        sessions.map((s) => (
          <button
            key={s._id}
            type="button"
            className={`card ${vr.sessionCard}`}
            onClick={() => navigate(`/admin/vehicle-rental/${s._id}`)}
          >
            <div className={vr.sessionTop}>
              <strong>{formatDateShort(s.date)}</strong>
              <span className={s.status === 'submitted' ? vr.badgeDone : vr.badgePending}>
                {s.status === 'submitted' ? 'Submitted' : 'Pending'}
              </span>
            </div>
            <div className={vr.sessionMeta}>
              {s.vehicleOwnerName} · {formatINR(s.rentalAmount)}
            </div>
            <div className={vr.sessionMeta}>
              {s.entries?.length || 0} users
              {s.submittedAt ? ` · Saved ${new Date(s.submittedAt).toLocaleString()}` : ''}
            </div>
          </button>
        ))
      )}
    </AppShell>
  );
}
