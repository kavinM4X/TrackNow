import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import be from '../admin/BatchEntry.module.css';
import vr from '../admin/VehicleRental.module.css';

function PartyEditForm({ id }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [party, setParty] = useState(null);
  const [batchEntry, setBatchEntry] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const load = async () => {
      try {
        const [partiesRes, batchesRes] = await Promise.all([
          api.get('/admin/driver/parties'),
          api.get('/admin/driver/party-batches')
        ]);
        const p = partiesRes.data.find((x) => x._id === id);
        if (!p) {
          setLoading(false);
          return;
        }
        setParty(p);

        const batch = batchesRes.data.find(
          (b) =>
            b.status === 'submitted' &&
            String(b.driverUserId) === String(p.driverUserId?._id || p.driverUserId) &&
            b.assignedDate === p.assignedDate &&
            (b.city || '') === (p.city || '')
        );
        if (batch) {
          setBatchId(batch._id);
          const detail = await api.get(`/admin/driver/party-batches/${batch._id}`);
          const row = detail.data.parties?.find((x) => x._id === id);
          setBatchEntry(row?.batchEntry || null);
          reset({
            goodRateOverride: p.goodRateOverride ?? '',
            wasteRateOverride: p.wasteRateOverride ?? '',
            doubleRateOverride: p.doubleRateOverride ?? ''
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load party');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, reset]);

  const onSubmit = async (data) => {
    setError('');
    const body = {
      name: party.name,
      phone: party.phone,
      village: party.village,
      clientUserId: party.clientUserId?._id || party.clientUserId || null,
      assignedDate: party.assignedDate,
      driverUserId: party.driverUserId?._id || party.driverUserId,
      driverName: party.driverName,
      city: party.city,
      goodRateOverride: data.goodRateOverride ? Number(data.goodRateOverride) : null,
      wasteRateOverride: data.wasteRateOverride ? Number(data.wasteRateOverride) : null,
      doubleRateOverride: data.doubleRateOverride ? Number(data.doubleRateOverride) : null
    };
    try {
      await api.put(`/admin/driver/parties/${id}`, body);
      navigate(batchId ? `/admin/driver/parties/batch/${batchId}` : '/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  if (loading) return <div className="spinner" />;

  if (!party) {
    return <p className="form-error">Party not found</p>;
  }

  if (!batchEntry?.completed) {
    return (
      <div className="card">
        <p style={{ fontSize: 13, color: '#888' }}>
          Edit is available only after the driver submits this batch.
        </p>
        <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const e = batchEntry;

  return (
    <form className="card" onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label">Name</label>
      <input className="field-input" readOnly value={party.name || ''} />

      <label className="field-label">Phone</label>
      <input className="field-input" readOnly value={party.phone || ''} />

      <label className="field-label">Village</label>
      <input className="field-input" readOnly value={party.village || ''} />

      <p className="section-title">Driver entry (submitted)</p>
      <div style={{ fontSize: 12, color: '#444', marginBottom: 12 }}>
        Good {e.goodSilkKg}kg @ {formatINR(e.goodSilkRatePerKg)}/kg · Waste {e.wasteKg}kg @{' '}
        {formatINR(e.wasteRatePerKg)}/kg · Doubles {e.doublesKg}kg @ {formatINR(e.doublesRatePerKg)}/kg
        <div style={{ marginTop: 6 }}>
          Net {formatINR(e.netSilkValue)} · Rental −{formatINR(e.rentalAmount)} · Final{' '}
          {formatINR(e.finalAmount)}
        </div>
      </div>

      <p className="section-title">Rate overrides (optional)</p>
      <label className="field-label">Good rate ₹/kg</label>
      <input type="number" className="field-input" {...register('goodRateOverride')} />
      <label className="field-label">Waste rate ₹/kg</label>
      <input type="number" className="field-input" {...register('wasteRateOverride')} />
      <label className="field-label">Double rate ₹/kg</label>
      <input type="number" className="field-input" {...register('doubleRateOverride')} />
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn-primary">
        Save rates
      </button>
    </form>
  );
}

function PartyAddForm() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState('Coimbatore');
  const [rentalAmount, setRentalAmount] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data.filter((u) => u.role === 'user')));
    api.get('/admin/driver/driver-users').then((r) => setDrivers(r.data));
  }, []);

  useEffect(() => {
    if (!selectedDriverId) {
      setRentalAmount('');
      return;
    }
    api
      .get('/admin/driver/vehicles')
      .then((r) => {
        const v = r.data.find(
          (x) => String(x.driverUserId?._id || x.driverUserId) === selectedDriverId && x.status === 'active'
        );
        if (v?.advanceTotal > 0) {
          setRentalAmount((prev) => (prev.trim() ? prev : String(v.advanceTotal)));
        }
      })
      .catch(() => {});
  }, [selectedDriverId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [users, userSearch]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.name?.toLowerCase().includes(q) || d.phone?.includes(q));
  }, [drivers, driverSearch]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const pickDriver = (driverId) => {
    setSelectedDriverId((prev) => (prev === driverId ? '' : driverId));
    setDriverSearch('');
  };

  const selectedDriver = drivers.find((d) => d._id === selectedDriverId);

  const onSave = async () => {
    setError('');
    if (!selectedDriverId) {
      setError('Add a driver');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Add at least one user');
      return;
    }
    if (!rentalAmount || Number(rentalAmount) <= 0) {
      setError('Enter rental amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/driver/parties/bulk', {
        userIds: selectedUserIds,
        driverUserId: selectedDriverId,
        city: location,
        assignedDate: date,
        rentalAmount: Number(rentalAmount)
      });
      navigate('/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <label className="field-label">Date</label>
      <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />

      <label className="field-label">Market</label>
      <select className="field-select" value={location} onChange={(e) => setLocation(e.target.value)}>
        <option value="Coimbatore">Coimbatore</option>
        <option value="Mamballi">Mamballi</option>
        <option value="Ramnagar">Ramnagar</option>
        <option value="Dharmapuri">Dharmapuri</option>
      </select>

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Add driver
      </p>
      <input
        className="field-input"
        placeholder="Search driver to add…"
        value={driverSearch}
        onChange={(e) => setDriverSearch(e.target.value)}
      />
      {selectedDriver && (
        <div className={vr.chips}>
          <button type="button" className={vr.chip} onClick={() => setSelectedDriverId('')}>
            {selectedDriver.name} ×
          </button>
        </div>
      )}
      <div className={vr.userPickList}>
        {filteredDrivers.slice(0, 8).map((d) => (
          <button
            key={d._id}
            type="button"
            className={`${vr.userPick} ${selectedDriverId === d._id ? vr.userPickOn : ''}`}
            onClick={() => pickDriver(d._id)}
          >
            {d.name}
            <span style={{ fontSize: 11, color: '#888', display: 'block' }}>{d.phone}</span>
          </button>
        ))}
      </div>
      <p className={be.hint}>{selectedDriverId ? '1 driver added for driver entry' : '0 driver(s) added for driver entry'}</p>

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Driver entry
      </p>
      <label className="field-label">Rental amount (₹)</label>
      <input
        type="number"
        min="0"
        className="field-input"
        placeholder="e.g. 5000"
        value={rentalAmount}
        onChange={(e) => setRentalAmount(e.target.value)}
      />

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Add users
      </p>
      <input
        className="field-input"
        placeholder="Search user to add…"
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
      />
      {selectedUserIds.length > 0 && (
        <div className={vr.chips}>
          {selectedUserIds.map((userId) => {
            const u = users.find((x) => x._id === userId);
            return (
              <button key={userId} type="button" className={vr.chip} onClick={() => toggleUser(userId)}>
                {u?.name || userId} ×
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
            className={`${vr.userPick} ${selectedUserIds.includes(u._id) ? vr.userPickOn : ''}`}
            onClick={() => toggleUser(u._id)}
          >
            {u.name}
          </button>
        ))}
      </div>
      <p className={be.hint}>{selectedUserIds.length} user(s) added for driver entry</p>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" style={{ marginTop: 8 }} disabled={saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save for driver entry'}
      </button>
    </div>
  );
}

export default function PartyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');

  return (
    <AppShell
      title={isEdit ? 'Edit Party' : 'Driver Party Entry'}
      backPath="/admin/driver/parties"
      driverSection
      hideNav
    >
      {isEdit ? <PartyEditForm id={id} /> : <PartyAddForm />}
    </AppShell>
  );
}
