import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { todayISO } from '../../utils/format';
import be from '../admin/BatchEntry.module.css';
import vr from '../admin/VehicleRental.module.css';

function userVillage(u) {
  return u?.farmDetails?.farmLocation || u?.address || u?.village || '';
}

function PartyEditForm({ id }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [linkedUser, setLinkedUser] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { clientUserId: '', assignedDate: todayISO() }
  });

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data.filter((u) => u.role === 'user')));
  }, []);

  useEffect(() => {
    api.get('/admin/driver/parties').then((r) => {
      const p = r.data.find((x) => x._id === id);
      if (p) {
        reset({
          ...p,
          clientUserId: p.clientUserId?._id || p.clientUserId || '',
          assignedDate: p.assignedDate || todayISO()
        });
        if (p.clientUserId || p.phone) {
          setLinkedUser({
            _id: p.clientUserId?._id || p.clientUserId,
            name: p.name,
            phone: p.phone,
            village: p.village
          });
        }
      }
    });
  }, [id, reset]);

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (q.length < 2) return [];
    return users
      .filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q))
      .slice(0, 12)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        phone: u.phone,
        village: userVillage(u)
      }));
  }, [users, searchQ]);

  const pickUser = (u) => {
    setLinkedUser(u);
    setValue('name', u.name);
    setValue('phone', u.phone);
    setValue('village', u.village || '');
    setValue('clientUserId', u._id);
    setSearchQ('');
    setSearchResults([]);
  };

  const onSubmit = async (data) => {
    setError('');
    const body = {
      name: data.name,
      phone: data.phone,
      village: data.village,
      clientUserId: data.clientUserId || null,
      assignedDate: data.assignedDate,
      goodRateOverride: data.goodRateOverride ? Number(data.goodRateOverride) : null,
      wasteRateOverride: data.wasteRateOverride ? Number(data.wasteRateOverride) : null,
      doubleRateOverride: data.doubleRateOverride ? Number(data.doubleRateOverride) : null
    };
    try {
      await api.put(`/admin/driver/parties/${id}`, body);
      navigate('/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label">Date</label>
      <input className="field-input" type="date" {...register('assignedDate')} />

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Link client user
      </p>
      <input
        className="field-input"
        type="text"
        placeholder="Search by name or phone…"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
      />
      {searchResults.length > 0 && (
        <div className={vr.userPickList}>
          {searchResults.map((u) => (
            <button key={u._id} type="button" className={vr.userPick} onClick={() => pickUser(u)}>
              <strong>{u.name}</strong>
              <span style={{ fontSize: 11, color: '#888', display: 'block' }}>
                {u.phone}
                {u.village ? ` · ${u.village}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      {linkedUser && (
        <p className={be.hint}>
          Linked: {linkedUser.name} · {linkedUser.phone}
        </p>
      )}
      <input type="hidden" {...register('clientUserId')} />

      <label className="field-label">Name</label>
      <input className="field-input" {...register('name', { required: true })} />
      <label className="field-label">Phone</label>
      <input className="field-input" type="tel" {...register('phone')} />
      <label className="field-label">Village</label>
      <input className="field-input" {...register('village')} />

      <p className="section-title">Rate overrides (optional)</p>
      <label className="field-label">Good rate ₹/kg</label>
      <input type="number" className="field-input" {...register('goodRateOverride')} />
      <label className="field-label">Waste rate ₹/kg</label>
      <input type="number" className="field-input" {...register('wasteRateOverride')} />
      <label className="field-label">Double rate ₹/kg</label>
      <input type="number" className="field-input" {...register('doubleRateOverride')} />
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn-primary">
        Save Party
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

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q)
    );
  }, [users, userSearch]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) => d.name?.toLowerCase().includes(q) || d.phone?.includes(q)
    );
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
    setSaving(true);
    try {
      await api.post('/admin/driver/parties/bulk', {
        userIds: selectedUserIds,
        driverUserId: selectedDriverId,
        city: location,
        assignedDate: date
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
      <input
        type="date"
        className="field-input"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

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
